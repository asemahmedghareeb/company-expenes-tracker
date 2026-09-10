import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { defaultSplitsSchema } from "@/lib/validations";

export async function PUT(req: Request) {
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
  await db.$transaction(
    parsed.data.map((row) =>
      db.partner.update({
        where: { id: row.partnerId },
        data: { defaultSharePercentage: row.sharePercentage },
      }),
    ),
  );
  return NextResponse.json({ updated: parsed.data.length });
}
