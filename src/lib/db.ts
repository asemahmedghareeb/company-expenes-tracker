/**
 * Backwards-compatible alias — the canonical singleton lives in
 * `@/lib/prisma`. Re-exporting (not re-instantiating) guarantees every
 * `import { db } from "@/lib/db"` shares ONE PrismaClient in serverless.
 */
export { prisma as db, prisma as default } from "./prisma";
