import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — Lightweight warmer & health check endpoint.
 * Keeps serverless cold starts at bay and verifies live DB connectivity.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        timestamp: Date.now(),
        db: "connected",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Database connection error";
    return NextResponse.json(
      {
        status: "error",
        error: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
