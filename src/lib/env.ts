import { z } from "zod";

/**
 * Server environment schema — validated lazily at runtime (fail-fast with a
 * clear message instead of a cryptic Prisma/jose crash mid-request).
 *
 * SERVER-ONLY: never import this module (or anything importing it) from a
 * `"use client"` component — it reads server secrets and throws in browsers.
 *
 * Usage: call `getEnv()` (or `validateEnv()` at startup) from server code.
 * `session-token.ts` and `lib/prisma.ts` both funnel through here, so a
 * missing/short AUTH_SECRET or DATABASE_URL fails once, loudly, at boot.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((s) => s.startsWith("postgres"), {
      message: "DATABASE_URL must be a Postgres connection string",
    }),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .refine((s) => !/replace-me|changeme|example|test-/i.test(s), {
      message: "AUTH_SECRET is still a placeholder — generate a real secret (see .env.example)",
    }),
  // Seed-admin CLI only (never read by the web runtime).
  ADMIN_USERNAME: z.string().min(1).optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validated server env. Throws a single descriptive Error when invalid. */
export function getEnv(): Env {
  if (cached) return cached;
  if (typeof window !== "undefined") {
    throw new Error("getEnv() must never run in the browser — server-only module.");
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(
      `Invalid server environment — ${details}. See .env.example for required variables.`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Alias for startup-time validation (e.g. instrumentation, route entry). */
export function validateEnv(): Env {
  return getEnv();
}
