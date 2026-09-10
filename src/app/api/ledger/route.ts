import { NextResponse } from "next/server";
import { getDashboardData } from "@/actions/queries";

/** Computed partner balances — Balance = pending + profitShares − drawings. */
export async function GET() {
  const { ledgers, overview } = await getDashboardData();
  return NextResponse.json({ ledgers, overview });
}
