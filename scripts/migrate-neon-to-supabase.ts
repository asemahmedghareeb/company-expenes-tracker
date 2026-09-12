/**
 * One-off data migration: Neon Postgres → Supabase Postgres.
 * Usage: npm run db:migrate-neon
 *
 * Source: Neon URL parsed from the commented `neon.tech` DATABASE_URL line in `.env`.
 * Target: Supabase via DIRECT_URL (session pooler :5432 — migration-safe).
 *
 * Safety: aborts if the target already holds financial history (anything beyond
 * bare partner rows), so it can never clobber a live Supabase dataset.
 * IDs are preserved (cuid PKs + FKs copy verbatim), so relations stay intact.
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

function neonUrlFromEnv(): string {
  if (process.env.NEON_DATABASE_URL) return process.env.NEON_DATABASE_URL;
  const envText = readFileSync(join(process.cwd(), ".env"), "utf8");
  const match = envText.match(/^#?\s*DATABASE_URL="([^"]*neon\.tech[^"]*)"/m);
  if (!match?.[1]) throw new Error("Neon DATABASE_URL not found in .env");
  return match[1];
}

const source = new PrismaClient({ datasources: { db: { url: neonUrlFromEnv() } } });
const target = new PrismaClient(); // DIRECT_URL via .env (session pooler)

/** Child-first wipe order (respects FK constraints). */
const WIPE_ORDER = [
  "companyExpensePayment",
  "companyPayout",
  "companyExpense",
  "companyFixedCost",
  "partnerDrawing",
  "projectExpense",
  "clientPayment",
  "projectPartner",
  "project",
  "partner",
] as const;

/** Parent-first copy order. */
const COPY_ORDER = [...WIPE_ORDER].reverse() as unknown as typeof WIPE_ORDER;

async function counts(db: PrismaClient) {
  const [partner, project, projectPartner, clientPayment, projectExpense, partnerDrawing, companyExpense, companyExpensePayment, companyPayout, companyFixedCost] =
    await Promise.all([
      db.partner.count(),
      db.project.count(),
      db.projectPartner.count(),
      db.clientPayment.count(),
      db.expense.count(),
      db.partnerDrawing.count(),
      db.companyExpense.count(),
      db.companyExpensePayment.count(),
      db.companyPayout.count(),
      db.companyFixedCost.count(),
    ]);
  return { partner, project, projectPartner, clientPayment, projectExpense, partnerDrawing, companyExpense, companyExpensePayment, companyPayout, companyFixedCost };
}

async function main() {
  console.log("→ Reading Neon (source) and Supabase (target) counts…");
  const [from, to] = await Promise.all([counts(source), counts(target)]);
  console.log("  Neon source:    ", from);
  console.log("  Supabase target:", to);

  const targetHasHistory =
    to.project + to.projectPartner + to.clientPayment + to.projectExpense +
      to.partnerDrawing + to.companyExpense + to.companyExpensePayment +
      to.companyPayout + to.companyFixedCost >
    0;
  if (targetHasHistory) {
    throw new Error(
      "Aborted: Supabase target already holds financial history. " +
        "Clear it manually before migrating.",
    );
  }

  console.log("→ Wiping Supabase app tables (child-first)…");
  await target.$transaction(WIPE_ORDER.map((m) => (target as any)[m].deleteMany()));

  console.log("→ Copying Neon → Supabase (parent-first, IDs preserved)…");
  for (const m of COPY_ORDER) {
    const rows = await (source as any)[m].findMany();
    if (rows.length === 0) {
      console.log(`  ${m}: 0 rows, skip`);
      continue;
    }
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await (target as any)[m].createMany({ data: rows.slice(i, i + BATCH) });
    }
    console.log(`  ${m}: copied ${rows.length} rows`);
  }

  const after = await counts(target);
  console.log("  Supabase after:", after);
  const mismatch = (Object.keys(from) as (keyof typeof from)[]).filter(
    (k) => from[k] !== after[k],
  );
  if (mismatch.length > 0) {
    throw new Error(`Count mismatch after copy: ${mismatch.join(", ")}`);
  }
  console.log("✓ Migration complete — all table counts match.");
}

main()
  .catch((e) => {
    console.error("✗ Migration FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
