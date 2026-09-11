import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma as db } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export type { SessionPayload };

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
 */
export async function getSessionUser(): Promise<AuthUser | null> {
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
