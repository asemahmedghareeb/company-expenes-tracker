import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import {
  clientPaymentSchema,
  projectExpenseSchema,
  markReimbursedSchema,
  partnerDrawingSchema,
} from "@/lib/validations";
import { CLIENT_PAYER } from "@/lib/shares";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "payment";
  const body = await req.json();

  try {
    if (kind === "payment") {
      const parsed = clientPaymentSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
      const p = await db.clientPayment.create({
        data: {
          projectId: parsed.data.projectId,
          amount: parsed.data.amount,
          milestoneLabel: parsed.data.milestoneLabel || null,
          notes: parsed.data.notes || null,
          paidAt: parsed.data.paidAt,
          receivedByPartnerId: parsed.data.receivedByPartnerId,
        },
      });
      return NextResponse.json(p, { status: 201 });
    }
    if (kind === "expense") {
      const parsed = projectExpenseSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid expense." }, { status: 400 });
      const e = await db.projectExpense.create({
        data: {
          projectId: parsed.data.projectId,
          paidByPartnerId:
            parsed.data.paidByPartnerId === CLIENT_PAYER
              ? null
              : parsed.data.paidByPartnerId,
          amount: parsed.data.amount,
          description: parsed.data.description,
          expenseDate: parsed.data.expenseDate,
        },
      });
      return NextResponse.json(e, { status: 201 });
    }
    if (kind === "reimburse") {
      const parsed = markReimbursedSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
      const e = await db.projectExpense.update({
        where: { id: parsed.data.expenseId },
        data: {
          isReimbursed: parsed.data.isReimbursed,
          reimbursedAt: parsed.data.isReimbursed ? new Date() : null,
        },
      });
      return NextResponse.json(e);
    }
    if (kind === "drawing") {
      const parsed = partnerDrawingSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid drawing." }, { status: 400 });
      const d = await db.partnerDrawing.create({
        data: {
          partnerId: parsed.data.partnerId,
          amount: parsed.data.amount,
          notes: parsed.data.notes || null,
          drawnAt: parsed.data.drawnAt,
        },
      });
      return NextResponse.json(d, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown kind." }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed." },
      { status: 400 },
    );
  }
}
