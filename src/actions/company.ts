"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  companyExpenseSchema,
  companyExpenseWithPaymentsSchema,
  companyFixedCostSchema,
  companyPaymentSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";

function revalidateCompany() {
  revalidatePath("/company");
  revalidatePath("/ledger");
  revalidatePath("/");
}

/** Record a company overhead bill (rent, subscriptions…). Split happens live by default equity. */
export async function addCompanyExpense(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = companyExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid expense data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  try {
    const expense = await db.companyExpense.create({
      data: {
        title: parsed.data.title,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
        expenseDate: parsed.data.expenseDate,
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to add expense.",
    };
  }
}

export async function deleteCompanyExpense(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.companyExpense.delete({ where: { id } });
    revalidateCompany();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete expense.",
    };
  }
}

/** Record who paid how much toward a company bill. Overpayments auto-credit. */
export async function recordCompanyPayment(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = companyPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid payment data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const [expense, partner] = await Promise.all([
    db.companyExpense.findUnique({
      where: { id: parsed.data.expenseId },
      select: { id: true },
    }),
    db.partner.findUnique({
      where: { id: parsed.data.partnerId },
      select: { id: true },
    }),
  ]);
  if (!expense) return { ok: false, error: "Expense not found." };
  if (!partner) return { ok: false, error: "Partner not found." };

  try {
    const payment = await db.companyExpensePayment.create({
      data: {
        expenseId: parsed.data.expenseId,
        partnerId: parsed.data.partnerId,
        amount: parsed.data.amount,
        paidAt: parsed.data.paidAt,
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: payment.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record payment.",
    };
  }
}

export async function deleteCompanyPayment(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.companyExpensePayment.delete({ where: { id } });
    revalidateCompany();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete payment.",
    };
  }
}

/**
 * Create a bill together with who paid how much — atomically.
 * Overpayments automatically become pending credit via the ledger engine.
 */
export async function addCompanyExpenseWithPayments(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = companyExpenseWithPaymentsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid expense data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const payerIds = [...new Set(parsed.data.payments.map((p) => p.partnerId))];
  if (payerIds.length > 0) {
    const payers = await db.partner.findMany({
      where: { id: { in: payerIds } },
      select: { id: true },
    });
    if (payers.length !== payerIds.length) {
      return { ok: false, error: "One or more paying partners do not exist." };
    }
  }
  try {
    const expense = await db.companyExpense.create({
      data: {
        title: parsed.data.title,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
        expenseDate: parsed.data.expenseDate,
        kind: parsed.data.kind,
        payments: {
          create: parsed.data.payments.map((p) => ({
            partnerId: p.partnerId,
            amount: p.amount,
          })),
        },
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to add expense.",
    };
  }
}

/* ------------------------- Fixed cost registry ------------------------ */

/** Define a fixed company cost once (rent, subscriptions…). Safe to delete: recorded instances snapshot their own title/amount. */
export async function addFixedCost(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = companyFixedCostSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid fixed cost data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  try {
    const fixed = await db.companyFixedCost.create({
      data: {
        title: parsed.data.title,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: fixed.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to add fixed cost.",
    };
  }
}

export async function deleteFixedCost(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.companyFixedCost.delete({ where: { id } });
    revalidateCompany();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete fixed cost.",
    };
  }
}
