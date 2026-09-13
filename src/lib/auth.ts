import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma as db } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSessionToken } from "./session-token";
import { verifySessionToken, type SessionPayload } from "./session-token";
import { AuthError } from "./api-guard";

export type { SessionPayload };
export { AuthError };

/* ------------------------- Password hashing (scrypt) ------------------------- */

const SCRYPT_KEYLEN = 64;

function encodeHash(salt: Buffer, derived: Buffer): string {
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Hash a plaintext password with a random salt (scrypt, memory-hard). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return encodeHash(salt, derived);
}

/** Constant-time password check. Returns false on any malformed input. */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, saltHex, hashHex] = stored.split("$");
    if (algo !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false;
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/* ------------------------------- Credentials ------------------------------- */

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

/** Validate credentials. Generic failure (null) — never reveals which field was wrong. */
export async function loginUser(username: string, password: string): Promise<AuthUser | null> {
  const name = username.trim();
  if (!name || !password) return null;
  const user = await db.user.findUnique({ where: { username: name } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

/* --------------------------------- Session --------------------------------- */

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/** Persist a signed session JWT after successful login. */
export async function createSession(user: AuthUser): Promise<void> {
  const token = await signSessionToken({
    sub: user.id,
    username: user.username,
    role: user.role,
  });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
}

/** Destroy the session cookie (logout). */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Current request's session: verifies the JWT signature/expiry AND confirms
 * the account still exists (revokes sessions of deleted users).
 */export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = await verifySessionToken(token);
    if (!payload) return null;
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true },
    });
    return user;
    } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      ((error as { digest: string }).digest === "DYNAMIC_SERVER_USAGE" ||
        (error as { digest: string }).digest.startsWith("NEXT_"))
    ) {
      throw error;
    }
    return null;
  }
}

/* --------------------- Server-Action / page guards --------------------- */

/**
 * Fast JWT-only session check (no DB hit). Use for READ paths where the
 * caller already passed the proxy gate and cost matters (page data loaders).
 * Throws AuthError(401) when unauthenticated.
 */
export async function requireSession(): Promise<SessionPayload> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  if (!payload) throw new AuthError(401);
  return payload;
}

/**
 * Defense-in-depth guard for Server Actions and pages. The proxy gate keeps
 * strangers out, but every sensitive function must ALSO verify auth itself —
 * never rely on the boundary alone (SSRF-adjacent bypasses, misconfigurations).
 *
 * Throws AuthError(401) when unauthenticated. Call it as the FIRST line:
 *   export async function mutate(...) { await requireSessionUser(); ... }
 */
export async function requireSessionUser(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401);
  return user;
}

/**
 * RBAC gate for mutations. Single-role app today (every user is `admin`),
 * so this currently equals requireSessionUser + role check — the seam where
 * future roles (viewer, accountant…) get enforced without touching call sites.
 *
 * Throws AuthError(401) unauthenticated / AuthError(403) wrong role.
 */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireSessionUser();
  if (user.role !== "admin") throw new AuthError(403);
  return user;
}
