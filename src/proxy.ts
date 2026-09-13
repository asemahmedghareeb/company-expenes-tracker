import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";
import { checkRateLimit, getClientIp, retryAfterSeconds } from "@/lib/rate-limit";
import { checkSameOrigin } from "@/lib/api-guard";

/**
 * Session gate — no visitor reads company data without a valid JWT session.
 * Proxy runs on the Node.js runtime (Next 16 default), so jose verification
 * works here; the helper imports no Prisma/`next/headers` (edge-safe).
 *
 * Defense in depth: Server Actions POST to their page route, so they pass
 * through this gate too — but always verify auth inside sensitive functions
 * as well (see Data Security guide), never rely on the boundary alone.
 *
 * Additional hardening enforced here:
 * - Rate limiting on /api/* (backstop; login brute-force is ALSO throttled
 *   inside the `login` Server Action with a tighter budget).
 * - Same-origin enforcement for state-changing /api calls (CSRF backstop
 *   behind SameSite=Lax cookies). These APIs have no public consumers.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets bypass the gate (deterministic in-code check — avoids
  // path-to-regexp subtleties with extension-based matcher exclusions).
  if (
    pathname.startsWith("/_next/") ||
    /\.(png|svg|ico|webmanifest|js|css|woff2?|ttf|txt|xml)$/.test(pathname) ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Public: login page, legal pages, and warmer/health check (everything else needs a session).
  if (
    pathname === "/login" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/cookies" ||
    pathname === "/refunds" ||
    pathname === "/api/health"
  ) {
    // Health warmer is public but still rate-limited below via the /api/* rule.
    if (pathname !== "/api/health") return NextResponse.next();
  }

  // --- API traffic defense (applies before AND after auth) ---
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(request.headers);
    const limit = checkRateLimit(`api:${ip}`, { limit: 120, windowMs: 60_000 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Slow down and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds(limit.retryAfterMs)) },
        },
      );
    }
    // State-changing API calls must be same-origin. GETs (health, reads)
    // stay available to any authenticated caller.
    if (request.method !== "GET" && !checkSameOrigin(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Warmer stays public (rate-limited above); everything else needs a session.
  if (pathname === "/api/health") return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) {
    return NextResponse.next();
  }

  // Data APIs fail closed with JSON (no login HTML for fetch callers).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Match everything; static/public exclusions happen in code above.
  matcher: ["/:path*"],
};
