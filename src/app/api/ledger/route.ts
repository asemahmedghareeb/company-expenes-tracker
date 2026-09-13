import { NextResponse } from "next/server";
import { getDashboardData } from "@/actions/queries";
import { requireSession, authErrorResponse } from "@/lib/api-guard";

/** Computed partner balances — Balance = pending + profitShares − drawings. */
export async function GET(req: Request) {
  try {
    await requireSession(req);
  } catch (e) {
    return authErrorResponse(e);
  }
  const { ledgers, overview } = await getDashboardData();
  return NextResponse.json({ ledgers, overview });
}
