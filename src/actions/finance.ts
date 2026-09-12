"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  partnerDrawingSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import {
  recordClientPayment as _recordClientPayment,
  deleteClientPayment as _deleteClientPayment,
} from "./payments";
import {
  createExpense as _createExpense,
  logProjectExpense as _logProjectExpense,
  markExpenseReimbursed as _markExpenseReimbursed,
  deleteExpense as _deleteExpense,
  deleteProjectExpense as _deleteProjectExpense,
} from "./expenses";

/* Explicit async wrapper exports for Next.js Server Actions compatibility */
export async function recordClientPayment(raw: unknown) {
  return _recordClientPayment(raw);
}

export async function deleteClientPayment(id: string, projectId: string) {
  return _deleteClientPayment(id, projectId);
}

export async function createExpense(raw: unknown) {
  return _createExpense(raw);
}

export async function logProjectExpense(raw: unknown) {
  return _logProjectExpense(raw);
}

export async function markExpenseReimbursed(raw: unknown) {
  return _markExpenseReimbursed(raw);
}

export async function deleteExpense(id: string, projectId?: string | null) {
  return _deleteExpense(id, projectId);
}

export async function deleteProjectExpense(id: string, projectId: string) {
  return _deleteProjectExpense(id, projectId);
}

function revalidateFinance() {
  revalidateSystem();
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
