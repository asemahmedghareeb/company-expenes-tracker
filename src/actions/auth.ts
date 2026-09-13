"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, loginUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, retryAfterSeconds } from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  password: z.string().min(1, "Password is required").max(256),
});

export interface LoginState {
  ok: boolean;
  error?: string;
}

/**
 * Authenticate + mint a session cookie. On success redirects (optionally to
 * `?next=`); on failure returns a generic error — never which field was wrong.
 *
 * Brute-force defense: 8 attempts / 10 min per client IP (in-memory sliding
 * window; see lib/rate-limit.ts). Failures stay generic so the limiter can't
 * be used as a username oracle.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter your username and password." };
  }
  const ip = getClientIp(await headers());
  const limit = checkRateLimit(`login:${ip}`, { limit: 8, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many sign-in attempts. Wait ${retryAfterSeconds(limit.retryAfterMs)}s and try again.`,
    };
  }
  let user;
  try {
    user = await loginUser(parsed.data.username, parsed.data.password);
  } catch {
    return { ok: false, error: "Login is unavailable — server misconfigured." };
  }
  if (!user) {
    return { ok: false, error: "Invalid username or password." };
  }
  try {
    await createSession(user);
  } catch (err) {
    console.error("Failed to create session:", err);
    return { ok: false, error: "Unable to establish session. Please try again." };
  }
  const next = (formData.get("next") as string) || "/";
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/** Log out everywhere: clears the session cookie and lands on /login. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
