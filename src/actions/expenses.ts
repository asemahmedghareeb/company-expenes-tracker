"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  expenseSchema,
  markReimbursedSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import { CLIENT_PAYER } from "@/lib/shares";
import { toNumber, round2 } from "@/lib/ledger";

function revalidateFinance(projectId?: string | null) {
  revalidateSystem(projectId ? `/projects/${projectId}` : undefined);
}

export interface CreateExpenseResult {
  id: string;
  deductedFromCustody: boolean;
  exceededCustody: boolean;
  availableCustody: number;
  message?: string;
}

/**
 * Log an expense — can be a Project Direct Expense (projectId provided)
 * or Firm General Expense (projectId null/undefined).
 *
 * When a project expense is paid by a partner holding project funds,
 * selecting "خصم من عهدة مشروع" deducts directly from that partner's
 * project custody balance.
 *
 * If the expense amount exceeds available project cash, it is recorded
 * as "Paid Out of Pocket / شريك دافع من جيبه" (deductFromCustody: false).
 */
export async function createExpense(
  raw: unknown,
): Promise<ActionResult<CreateExpenseResult>> {
  const parsed = expenseSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return {
      ok: false,
      error: firstIssue || "Invalid expense data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const {
    projectId: rawProjectId,
    paidById: rawPaidById,
    paidByPartnerId: rawPaidByPartnerId,
    amount,
    description,
    expenseDate,
    deductFromCustody: wantDeductFromCustody,
    expenseIds,
  } = parsed.data;

  const projectId =
    rawProjectId && rawProjectId.trim().length > 0 ? rawProjectId.trim() : null;
  const payerId = (rawPaidById || rawPaidByPartnerId || "").trim();
  const clientCovered =
    payerId === CLIENT_PAYER ||
    (Boolean(projectId) && (!payerId || payerId === "null" || payerId === "undefined"));

  // Project must exist if provided; Partner payer must exist if not client covered
  const [project, payer] = await Promise.all([
    projectId
      ? db.project.findUnique({ where: { id: projectId }, select: { id: true } })
      : null,
    clientCovered
      ? null
      : db.partner.findUnique({
          where: { id: payerId },
          select: { id: true, name: true },
        }),
  ]);

  if (projectId && !project) return { ok: false, error: "Project not found." };
  if (!clientCovered && !payer)
    return { ok: false, error: "Paying partner not found." };

  let deductFromCustody = clientCovered;
  let exceededCustody = false;
  let availableCustody = 0;
  let alertMessage: string | undefined;

  // Project-scoped partner custody check
  if (projectId && wantDeductFromCustody && !clientCovered && payer) {
    // 1. Partner Project Inflow = Sum of ClientPayments received by Partner X for this project
    const inflows = await db.clientPayment.aggregate({
      where: {
        projectId,
        receivedByPartnerId: payer.id,
      },
      _sum: { amount: true },
    });
    const partnerInflow = toNumber(inflows._sum.amount ?? 0);

    // 2. Partner Project Outflow = Sum of Project Expenses deducted from custody by Partner X
    const outflows = await db.expense.aggregate({
      where: {
        projectId,
        paidById: payer.id,
        deductFromCustody: true,
      },
      _sum: { amount: true },
    });
    const partnerOutflow = toNumber(outflows._sum.amount ?? 0);

    availableCustody = round2(partnerInflow - partnerOutflow);

    if (amount <= availableCustody) {
      deductFromCustody = true;
    } else {
      exceededCustody = true;
      alertMessage = `Paid Out of Pocket / شريك دافع من جيبه (Amount ${amount} exceeds available project custody ${availableCustody})`;
    }
  }

  try {
    if (expenseIds && expenseIds.length > 0) {
      await db.expense.updateMany({
        where: {
          id: { in: expenseIds },
          ...(projectId ? { projectId } : {}),
        },
        data: {
          paidById: clientCovered ? null : payerId,
          deductFromCustody,
          isReimbursed: deductFromCustody,
          reimbursedAt: deductFromCustody ? new Date() : null,
          expenseDate,
        },
      });

      revalidateFinance(projectId);

      return {
        ok: true,
        data: {
          id: expenseIds[0]!,
          deductedFromCustody: deductFromCustody,
          exceededCustody,
          availableCustody,
          message: alertMessage,
        },
      };
    }

    const expense = await db.expense.create({
      data: {
        projectId,
        paidById: clientCovered ? null : payerId,
        amount,
        description,
        expenseDate,
        deductFromCustody,
        // When deducted directly from custody, it is already settled with custody funds
        isReimbursed: deductFromCustody,
        reimbursedAt: deductFromCustody ? new Date() : null,
      },
    });

    revalidateFinance(projectId);

    return {
      ok: true,
      data: {
        id: expense.id,
        deductedFromCustody: deductFromCustody,
        exceededCustody,
        availableCustody,
        message: alertMessage,
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record expense.",
    };
  }
}

/** Legacy alias for backward compatibility */
export async function logProjectExpense(raw: unknown) {
  return createExpense(raw);
}

/**
 * Mark an expense reimbursed (or un-reimburse). Sets/clears reimbursedAt.
 */
export async function markExpenseReimbursed(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = markReimbursedSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid reimbursement data." };
  }
  try {
    const expense = await db.expense.update({
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

export async function deleteExpense(
  id: string,
  projectId?: string | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    const expense = await db.expense.delete({ where: { id } });
    revalidateFinance(projectId ?? expense.projectId);
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete expense.",
    };
  }
}

export async function deleteProjectExpense(id: string, projectId: string) {
  return deleteExpense(id, projectId);
}
