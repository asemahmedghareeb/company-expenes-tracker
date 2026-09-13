import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { defaultSplitsSchema } from "@/lib/validations";
import { normalizeShares } from "@/lib/shares";
import { requireAdmin, authErrorResponse, toPublicError } from "@/lib/api-guard";

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e) {
    return authErrorResponse(e);
  }
  const body = await req.json();
  const parsed = defaultSplitsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Splits must sum to 100%.",
      },
      { status: 400 },
    );
  }
  const shares = normalizeShares(parsed.data.map((r) => r.sharePercentage));
  try {
    await db.$transaction(
      parsed.data.map((row, i) =>
        db.partner.update({
          where: { id: row.partnerId },
          data: { defaultSharePercentage: shares[i] ?? row.sharePercentage },
        }),
      ),
    );
    return NextResponse.json({ updated: parsed.data.length });
  } catch (e) {
    return NextResponse.json(
      { error: toPublicError(e, "Failed to update splits.") },
      { status: 400 },
    );
  }
}
