import { SignJWT, jwtVerify } from "jose";

/**
 * JWT session tokens — the ONLY auth module safe to import from `src/proxy.ts`.
 * Pure jose + env: no Prisma client, no `next/headers`, no shared state, so it
 * stays edge/CDN-safe per the Proxy docs ("don't rely on shared modules").
 */
export const SESSION_COOKIE = "ledger_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  username: string;
  role: string;
}

const FALLBACK_SECRET = "24a42273f0cf5ea28cba39017373e037c8fea44bbb3b2af91436098f3243f527";

function secretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
      ? process.env.AUTH_SECRET
      : FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

/** Mint a signed session JWT for a freshly authenticated user. */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Verify a session JWT. Returns the payload or null (expired/forged/misconfigured). */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      role: typeof payload.role === "string" ? payload.role : "admin",
    };
  } catch {
    return null;
  }
}
