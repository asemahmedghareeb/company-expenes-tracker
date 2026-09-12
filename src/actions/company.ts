"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  companyExpenseSchema,
  companyExpenseWithPaymentsSchema,
  companyFixedCostSchema,
  companyPaymentSchema,
  companyPayoutSchema,
  disburseCompanyVaultExpenseSchema,
  settleCompanyBillSchema,
  settleCompanyRowSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import { getCompanyExpenseSettlement, round2 } from "@/lib/ledger";

function revalidateCompany() {
  revalidateSystem();
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
  if (parsed.data.vaultAmount > parsed.data.amount) {
    return {
      ok: false,
      error: "المبلغ المودع في الخزنة لا يمكن أن يتجاوز إجمالي المصروف.",
    };
  }
  try {
    const expense = await db.companyExpense.create({
      data: {
        title: parsed.data.title,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
        expenseDate: parsed.data.expenseDate,
        vaultAmount: parsed.data.vaultAmount,
        vaultNotes: parsed.data.vaultNotes || null,
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
  if (parsed.data.vaultAmount > parsed.data.amount) {
    return {
      ok: false,
      error: "المبلغ المودع في الخزنة لا يمكن أن يتجاوز إجمالي المصروف.",
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
        vaultAmount: parsed.data.vaultAmount,
        vaultNotes: parsed.data.vaultNotes || null,
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

/* ------------------ Firm → partner payouts (settling credit) ------------------ */

/** Record cash the firm paid BACK to a partner (settles pending company credit). */
export async function recordCompanyPayout(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = companyPayoutSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid payout data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const expenseId =
    parsed.data.expenseId && parsed.data.expenseId !== ""
      ? parsed.data.expenseId
      : null;
  const [partner, expense] = await Promise.all([
    db.partner.findUnique({
      where: { id: parsed.data.partnerId },
      select: { id: true },
    }),
    expenseId
      ? db.companyExpense.findUnique({
          where: { id: expenseId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!partner) return { ok: false, error: "Partner not found." };
  if (expenseId && !expense) return { ok: false, error: "Expense not found." };

  try {
    const payout = await db.companyPayout.create({
      data: {
        partnerId: parsed.data.partnerId,
        expenseId,
        amount: parsed.data.amount,
        notes: parsed.data.notes || null,
        paidAt: parsed.data.paidAt,
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: payout.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record payout.",
    };
  }
}

export async function deleteCompanyPayout(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.companyPayout.delete({ where: { id } });
    revalidateCompany();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete payout.",
    };
  }
}

/**
 * One-click settlement of a partner's row on a company bill.
 * Owes (net<0) → records a partner→firm payment. Owed (net>0) → records a
 * firm→partner payout. Either way the row nets to exactly zero.
 */
export async function settleCompanyRow(
  raw: unknown,
): Promise<ActionResult<{ id: string; kind: "payment" | "payout"; amount: number }>> {
  const parsed = settleCompanyRowSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid settlement data." };
  }
  const { expenseId, partnerId } = parsed.data;

  const [expense, partners] = await Promise.all([
    db.companyExpense.findMany({
      where: { id: expenseId },
      select: {
        id: true,
        title: true,
        amount: true,
        payments: { select: { partnerId: true, amount: true } },
        payouts: { select: { partnerId: true, amount: true, expenseId: true } },
      },
    }),
    db.partner.findMany({
      select: { id: true, name: true, defaultSharePercentage: true, isActive: true },
    }),
  ]);
  const bill = expense[0];
  if (!bill) return { ok: false, error: "Expense not found." };

  const settlement = getCompanyExpenseSettlement(
    {
      id: bill.id,
      title: bill.title,
      amount: Number(bill.amount),
      payments: bill.payments.map((x) => ({
        partnerId: x.partnerId,
        amount: Number(x.amount),
      })),
      payouts: bill.payouts.map((x) => ({
        partnerId: x.partnerId,
        amount: Number(x.amount),
        expenseId: x.expenseId ?? undefined,
      })),
    },
    partners.map((p) => ({
      id: p.id,
      name: p.name,
      defaultSharePercentage: p.defaultSharePercentage,
      isActive: p.isActive,
    })),
  );
  const row = settlement.rows.find((r) => r.partnerId === partnerId);
  if (!row) return { ok: false, error: "Partner is not on this bill." };
  const due = round2(row.net);
  if (Math.abs(due) < 0.005) return { ok: false, error: "Already settled." };

  try {
    if (due < 0) {
      const payment = await db.companyExpensePayment.create({
        data: { expenseId, partnerId, amount: -due },
      });
      revalidateCompany();
      return { ok: true, data: { id: payment.id, kind: "payment", amount: -due } };
    }
    const payout = await db.companyPayout.create({
      data: { expenseId, partnerId, amount: due },
    });
    revalidateCompany();
    return { ok: true, data: { id: payout.id, kind: "payout", amount: due } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to settle.",
    };
  }
}

/**
 * One-click settlement of the WHOLE bill: every owing row gets a
 * partner→firm payment, every overpaid row gets a firm→partner payout —
 * atomically, so the bill ends fully settled in a single click.
 */
export async function settleCompanyBill(
  raw: unknown,
): Promise<
  ActionResult<{ payments: number; payouts: number; settled: number }>
> {
  const parsed = settleCompanyBillSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid settlement data." };
  }
  const { expenseId } = parsed.data;

  const [bills, partners] = await Promise.all([
    db.companyExpense.findMany({
      where: { id: expenseId },
      select: {
        id: true,
        title: true,
        amount: true,
        payments: { select: { partnerId: true, amount: true } },
        payouts: { select: { partnerId: true, amount: true, expenseId: true } },
      },
    }),
    db.partner.findMany({
      select: { id: true, name: true, defaultSharePercentage: true, isActive: true },
    }),
  ]);
  const bill = bills[0];
  if (!bill) return { ok: false, error: "Expense not found." };

  const settlement = getCompanyExpenseSettlement(
    {
      id: bill.id,
      title: bill.title,
      amount: Number(bill.amount),
      payments: bill.payments.map((x) => ({
        partnerId: x.partnerId,
        amount: Number(x.amount),
      })),
      payouts: bill.payouts.map((x) => ({
        partnerId: x.partnerId,
        amount: Number(x.amount),
        expenseId: x.expenseId ?? undefined,
      })),
    },
    partners.map((p) => ({
      id: p.id,
      name: p.name,
      defaultSharePercentage: p.defaultSharePercentage,
      isActive: p.isActive,
    })),
  );

  const duePayments = settlement.rows
    .filter((r) => r.net < -0.005)
    .map((r) => ({ partnerId: r.partnerId, amount: round2(-r.net) }));
  const duePayouts = settlement.rows
    .filter((r) => r.net > 0.005)
    .map((r) => ({ partnerId: r.partnerId, amount: round2(r.net) }));
  if (duePayments.length === 0 && duePayouts.length === 0) {
    return { ok: false, error: "Already settled." };
  }

  try {
    await db.$transaction([
      ...duePayments.map((p) =>
        db.companyExpensePayment.create({
          data: { expenseId, partnerId: p.partnerId, amount: p.amount },
        }),
      ),
      ...duePayouts.map((p) =>
        db.companyPayout.create({
          data: { expenseId, partnerId: p.partnerId, amount: p.amount },
        }),
      ),
    ]);
    revalidateCompany();
    return {
      ok: true,
      data: {
        payments: duePayments.length,
        payouts: duePayouts.length,
        settled: duePayments.length + duePayouts.length,
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to settle.",
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

/* ------------------------- Company Vault Disbursements ------------------------- */

/** Disburse held funds from the company vault to pay the expense (e.g. when rent becomes due next month). */
export async function disburseCompanyExpenseFromVault(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = disburseCompanyVaultExpenseSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid request." };
  }
  try {
    const expense = await db.companyExpense.update({
      where: { id: parsed.data.expenseId },
      data: {
        vaultDisbursed: true,
        vaultDisbursedAt: new Date(),
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to disburse from vault.",
    };
  }
}

/** Revert a vault disbursement, putting the reserved money back into the company vault. */
export async function revertCompanyExpenseVaultDisbursement(
  expenseId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const expense = await db.companyExpense.update({
      where: { id: expenseId },
      data: {
        vaultDisbursed: false,
        vaultDisbursedAt: null,
      },
    });
    revalidateCompany();
    return { ok: true, data: { id: expense.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to revert vault disbursement.",
    };
  }
}

