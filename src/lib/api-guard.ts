import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./session-token";

export type { SessionPayload };

/**
 * Shared auth/error guard for Route Handlers (`src/app/api/*`).
 *
 * Proxy-safe: cookie parsing + jose only — no `next/headers`, no Prisma —
 * so `src/proxy.ts` may import `checkSameOrigin` from here too.
 *
 * Two-tier model (see `lib/auth.ts` for the Server-Action counterparts):
 * - `requireSession(req)` — JWT signature/expiry only. Cheap; use for reads.
 * - `requireAdmin(req)`   — JWT + role check. Use for every mutation.
 *   (Single-role app today: all users are `admin`. The role check is the
 *   RBAC seam — adding roles later means widening this check, not finding
 *   every call site.)
 */

/** 401/403 signal. Handlers map it to JSON; never leak internals. */
export class AuthError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403, message = status === 401 ? "Unauthorized" : "Forbidden") {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) {
      const value = part.slice(idx + 1).trim();
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

/** JWT-valid session or throws AuthError(401). No DB hit (fast path). */
export async function requireSession(req: Request): Promise<SessionPayload> {
  const payload = (await verifySessionToken(tokenFromRequest(req) ?? "")) ?? null;
  if (!payload) throw new AuthError(401);
  return payload;
}

/** Valid session + `admin` role, or throws 401/403. Use for all mutations. */
export async function requireAdmin(req: Request): Promise<SessionPayload> {
  const session = await requireSession(req);
  if (session.role !== "admin") throw new AuthError(403);
  return session;
}

/**
 * Same-origin check for state-changing API calls (CSRF backstop behind
 * SameSite=Lax cookies). Browsers always send `Origin` on fetch POST/PUT;
 * plain-form POSTs send `Origin` or `Referer`. Returns false when a present
 * header mismatches the request host, or when neither is present on a
 * non-GET (non-browser client — these APIs have no public consumers).
 */
export function checkSameOrigin(req: Request): boolean {
  const host = new URL(req.url).host.toLowerCase();
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host.toLowerCase() === host;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Convert a caught error to its JSON response. AuthError maps to 401/403;
 * anything else becomes a generic 500 (no internals leak). Always returns
 * a Response so Route Handlers can `return authErrorResponse(e)` directly.
 */
export function authErrorResponse(e: unknown): Response {
  if (e instanceof AuthError) {
    return Response.json({ error: e.message }, { status: e.status });
  }
  return Response.json({ error: "Request failed." }, { status: 500 });
}

/**
 * Never return raw ORM/driver messages to clients (they leak table, column,
 * and constraint names). Known Prisma codes map to friendly text; everything
 * else collapses to the caller-supplied fallback.
 */
export function toPublicError(e: unknown, fallback: string): string {
  if (e instanceof AuthError) return e.message;
  if (typeof e === "object" && e !== null && "code" in e) {
    const code = (e as { code?: unknown }).code;
    if (code === "P2002") return "A record with these details already exists.";
    if (code === "P2025") return "Record not found. It may have been deleted.";
    if (code === "P2003") return "Related record not found. Refresh and try again.";
  }
  if (e instanceof Error && /unique constraint|already exists/i.test(e.message)) {
    return "A record with these details already exists.";
  }
  return fallback;
}
