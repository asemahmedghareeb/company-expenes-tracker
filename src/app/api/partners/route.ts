import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import { partnerSchema } from "@/lib/validations";
import {
  requireSession,
  requireAdmin,
  authErrorResponse,
  toPublicError,
} from "@/lib/api-guard";

export async function GET(req: Request) {
  try {
    await requireSession(req);
  } catch (e) {
    return authErrorResponse(e);
  }
  const partners = await db.partner.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e) {
    return authErrorResponse(e);
  }
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
    const message = toPublicError(e, "Failed to create partner.");
    const status = message === "A record with these details already exists." ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
