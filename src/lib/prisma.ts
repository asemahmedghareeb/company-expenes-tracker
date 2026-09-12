import { PrismaClient } from "@prisma/client";

/**
 * Strict global singleton for Neon Postgres on Vercel serverless.
 *
 * Each serverless invocation may re-evaluate the module graph — caching the
 * client on `globalThis` (in ALL environments, including production) prevents
 * connection exhaustion against the pooled `-pooler` DATABASE_URL.
 *
 * Canonical import: `import { prisma } from "@/lib/prisma"`.
 * `@/lib/db` re-exports this same instance for backwards compatibility —
 * never `new PrismaClient()` elsewhere in `src/`.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Backwards-compatibility alias for legacy code referring to projectExpense
if (!(prisma as unknown as { projectExpense?: unknown }).projectExpense) {
  Object.defineProperty(prisma, "projectExpense", {
    get() {
      return (prisma as unknown as { expense: unknown }).expense;
    },
    configurable: true,
  });
}

// Always cache — including production. Gating this behind
// `NODE_ENV !== "production"` is the classic serverless connection leak.
globalForPrisma.prisma = prisma;

export default prisma;
