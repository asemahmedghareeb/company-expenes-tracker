import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — Neon connectivity check.
 * Runs a trivial query through the pooled DATABASE_URL and reports
 * latency plus per-table row counts so you can confirm the schema is live.
 */
export async function GET() {
  const started = Date.now();
  try {
    const ping = await db.$queryRaw<[{ ok: number }]>`SELECT 1 AS ok`;
    const [partners, projects, payments, expenses, drawings] =
      await Promise.all([
        db.partner.count(),
        db.project.count(),
        db.clientPayment.count(),
        db.projectExpense.count(),
        db.partnerDrawing.count(),
      ]);
    return NextResponse.json({
      status: "ok",
      database: "neon-postgres",
      ping: ping[0]?.ok === 1,
      latencyMs: Date.now() - started,
      tables: { partners, projects, payments, expenses, drawings },
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        database: "neon-postgres",
        latencyMs: Date.now() - started,
        error: e instanceof Error ? e.message : "Health check failed.",
      },
      { status: 500 },
    );
  }
}
