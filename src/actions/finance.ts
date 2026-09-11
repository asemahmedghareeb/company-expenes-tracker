"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  clientPaymentSchema,
  projectExpenseSchema,
  markReimbursedSchema,
  partnerDrawingSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import { CLIENT_PAYER } from "@/lib/shares";

function revalidateFinance(projectId?: string) {
  revalidateSystem(projectId ? `/projects/${projectId}` : undefined);
}

/* ------------------------- Client payments ------------------------- */

/** Record a milestone payment received from the client into a partner's custody. */
export async function recordClientPayment(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid payment data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const [project, custodian] = await Promise.all([
    db.project.findUnique({
      where: { id: parsed.data.projectId },
      select: { id: true },
    }),
    db.partner.findUnique({
      where: { id: parsed.data.receivedByPartnerId },
      select: { id: true },
    }),
  ]);
  if (!project) return { ok: false, error: "Project not found." };
  if (!custodian) return { ok: false, error: "Receiving partner not found." };

  try {
    const payment = await db.clientPayment.create({
      data: {
        projectId: parsed.data.projectId,
        amount: parsed.data.amount,
        milestoneLabel: parsed.data.milestoneLabel || null,
        notes: parsed.data.notes || null,
        paidAt: parsed.data.paidAt,
        receivedByPartnerId: parsed.data.receivedByPartnerId,
      },
    });
    revalidateFinance(parsed.data.projectId);
    return { ok: true, data: { id: payment.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record payment.",
    };
  }
}

export async function deleteClientPayment(
  id: string,
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.clientPayment.delete({ where: { id } });
    revalidateFinance(projectId);
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete payment.",
    };
  }
}

/* ------------------------- Project expenses ------------------------ */

/** Log a project cost fronted out-of-pocket by a partner.
 *  Project costs are always firm costs funded from collected contract cash —
 *  the client only pays the contract, never line items. (NULL-payer legacy
 *  rows predate this rule and stay firm-neutral.) */
export async function logProjectExpense(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = projectExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid expense data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const { projectId, paidByPartnerId } = parsed.data;
  const clientCovered = paidByPartnerId === CLIENT_PAYER;

  // Project must exist. Partner payer must exist; client needs no payer.
  const [project, payer] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { id: true } }),
    clientCovered
      ? Promise.resolve(null)
      : db.partner.findUnique({
          where: { id: paidByPartnerId },
          select: { id: true },
        }),
  ]);
  if (!project) return { ok: false, error: "Project not found." };
  if (!clientCovered && !payer)
    return { ok: false, error: "Paying partner not found." };

  try {
    const expense = await db.projectExpense.create({
      data: {
        projectId,
        paidByPartnerId: clientCovered ? null : paidByPartnerId,
        amount: parsed.data.amount,
        description: parsed.data.description,
        expenseDate: parsed.data.expenseDate,
      },
    });
    revalidateFinance(projectId);
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to log expense.",
    };
  }
}

/**
 * Mark an expense reimbursed (or un-reimburse). Sets/clears reimbursedAt.
 * This is the "settle expenses first" step when client cash arrives.
 */
export async function markExpenseReimbursed(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = markReimbursedSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid reimbursement data." };
  }
  try {
    const expense = await db.projectExpense.update({
      where: { id: parsed.data.expenseId },
      data: {
        isReimbursed: parsed.data.isReimbursed,
        reimbursedAt: parsed.data.isReimbursed ? new Date() : null,
      },
    });
    revalidateFinance(expense.projectId);
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update expense.",
    };
  }
}

export async function deleteProjectExpense(
  id: string,
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.projectExpense.delete({ where: { id } });
    revalidateFinance(projectId);
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete expense.",
    };
  }
}

/* -------------------------- Partner drawings ------------------------ */

/** Record a partner cash withdrawal (drawing against their balance). */
export async function recordPartnerDrawing(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = partnerDrawingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid drawing data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const partner = await db.partner.findUnique({
    where: { id: parsed.data.partnerId },
    select: { id: true },
  });
  if (!partner) return { ok: false, error: "Partner not found." };

  try {
    const drawing = await db.partnerDrawing.create({
      data: {
        partnerId: parsed.data.partnerId,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
        drawnAt: parsed.data.drawnAt,
      },
    });
    revalidateFinance();
    return { ok: true, data: { id: drawing.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record drawing.",
    };
  }
}

export async function deletePartnerDrawing(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.partnerDrawing.delete({ where: { id } });
    revalidateFinance();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete drawing.",
    };
  }
}
