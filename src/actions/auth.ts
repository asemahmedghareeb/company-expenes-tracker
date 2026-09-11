"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, loginUser } from "@/lib/auth";

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
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter your username and password." };
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
