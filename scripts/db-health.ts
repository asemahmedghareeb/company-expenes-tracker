/**
 * Supabase Postgres DB health check — read-only verification.
 * Usage: npm run db:health
 * Uses the pooled DATABASE_URL, runs SELECT 1 plus row counts, logs results.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const started = Date.now();
  console.log("→ Connecting to Supabase (pooled DATABASE_URL)…");

  const ping = await db.$queryRaw<[{ ok: number }]>`SELECT 1 AS ok`;
  console.log(`✓ Query OK: SELECT 1 → ${ping[0]?.ok}`);

  const [partners, projects, payments, expenses, drawings] =
    await Promise.all([
      db.partner.count(),
      db.project.count(),
      db.clientPayment.count(),
      db.projectExpense.count(),
      db.partnerDrawing.count(),
    ]);
  console.log("✓ Table counts:", {
    partners,
    projects,
    payments,
    expenses,
    drawings,
  });
  console.log(`✓ Supabase health check passed in ${Date.now() - started}ms`);
}

main()
  .catch((e) => {
    console.error("✗ Supabase health check FAILED:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
