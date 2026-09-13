import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";
import {
  clientPaymentSchema,
  projectExpenseSchema,
  markReimbursedSchema,
  partnerDrawingSchema,
} from "@/lib/validations";
import { CLIENT_PAYER } from "@/lib/shares";
import { requireAdmin, authErrorResponse, toPublicError } from "@/lib/api-guard";

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (e) {
    return authErrorResponse(e);
  }
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") ?? "payment";
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

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
      const payer = parsed.data.paidById || parsed.data.paidByPartnerId;
      const clientCovered = payer === CLIENT_PAYER;
      const isCustody = parsed.data.deductFromCustody || clientCovered;
      const e = await db.expense.create({
        data: {
          projectId: parsed.data.projectId,
          paidById: clientCovered ? null : payer,
          amount: parsed.data.amount,
          description: parsed.data.description,
          expenseDate: parsed.data.expenseDate,
          deductFromCustody: isCustody,
          isReimbursed: isCustody,
          reimbursedAt: isCustody ? new Date() : null,
        },
      });
      return NextResponse.json(e, { status: 201 });
    }
    if (kind === "reimburse") {
      const parsed = markReimbursedSchema.safeParse(body);
      if (!parsed.success)
        return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
      const e = await db.expense.update({
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
    // Never echo raw ORM messages (table/constraint names) to the client.
    return NextResponse.json(
      { error: toPublicError(e, "Request failed.") },
      { status: 400 },
    );
  }
}
