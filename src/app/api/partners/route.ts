import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { partnerSchema } from "@/lib/validations";

export async function GET() {
  const partners = await db.partner.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = partnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid partner data.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { name, email, defaultSharePercentage, isActive } = parsed.data;
  try {
    const partner = await db.partner.create({
      data: { name, email: email || null, defaultSharePercentage, isActive },
    });
    return NextResponse.json(partner, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create partner." },
      { status: 400 },
    );
  }
}
