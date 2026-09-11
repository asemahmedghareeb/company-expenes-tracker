import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const preferredRegion = "dub1";

/**
 * GET /api/health — Zero-overhead ping & database health check endpoint.
 *
 * Dual behavior:
 * - Default: Instantaneous HTTP 200 without calling Prisma or touching the database.
 *   Returns { status: "ok", timestamp: Date.now() }.
 * - Query param ?db=true: Explicitly executes SELECT 1 to verify live DB connectivity and warm connection pool.
 *   Returns { status: "ok", timestamp: Date.now(), db: "connected" }.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkDb = searchParams.get("db") === "true";

  const headers = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  if (!checkDb) {
    return NextResponse.json(
      {
        status: "ok",
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers,
      },
    );
  }

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
        headers,
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
        headers,
      },
    );
  }
}
