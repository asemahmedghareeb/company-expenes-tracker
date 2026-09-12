import { z } from "zod";
import {
  EQUITY_TOLERANCE,
  EQUITY_TOTAL,
  sharesSumTo100,
  CLIENT_PAYER,
} from "./shares";

/**
 * ------------------------------------------------------------------
 * Equity validation — stored data must ALWAYS sum to exactly 100%.
 * The tolerance below only absorbs 2-decimal rounding dust (e.g. a user
 * typing 33.33 three times); save paths run normalizeShares() so what
 * actually lands in the DB sums to exactly 100. Real errors still fail.
 * ------------------------------------------------------------------
 */
export { EQUITY_TOTAL, EQUITY_TOLERANCE, sharesSumTo100 };

export function equitySumMessage(shares: number[]): string {
  const total = shares.reduce((a, b) => a + b, 0);
  return `Equity splits must sum to exactly 100% (currently ${total.toFixed(2)}%).`;
}

const sharePercentage = z
  .coerce
  .number()
  .min(0, "Share cannot be negative")
  .max(100, "Share cannot exceed 100%");

const moneyAmount = z
  .coerce
  .number()
  .positive("Amount must be greater than zero")
  .max(1_000_000_000, "Amount is unreasonably large");

const cuid = z.string().min(1, "ID is required");
// NOTE: expense payer fields still accept the legacy CLIENT_PAYER sentinel
// ("CLIENT", see lib/shares) for pre-existing NULL-payer rows. The app model
// is that the client only pays the contract — never expense line items — so
// the UI no longer offers it and new expenses always name a partner.
// Server actions map the sentinel explicitly.

/* ------------------------------ Partner ------------------------------ */

export const partnerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  defaultSharePercentage: sharePercentage,
  isActive: z.boolean().default(true),
});

export type PartnerInput = z.infer<typeof partnerSchema>;

/** Re-assign global default equity across active partners. Must sum to 100. */
export const defaultSplitsSchema = z
  .array(
    z.object({
      partnerId: cuid,
      sharePercentage,
    }),
  )
  .min(1, "At least one partner is required")
  .refine((rows) => sharesSumTo100(rows.map((r) => r.sharePercentage)), {
    message: "Default equity splits must sum to exactly 100%.",
  });

export type DefaultSplitsInput = z.infer<typeof defaultSplitsSchema>;

/* ------------------------------ Project ------------------------------ */

export const projectStatusSchema = z.enum([
  "UPCOMING",
  "ACTIVE",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
]);

export type ProjectStatusInput = z.infer<typeof projectStatusSchema>;

export const projectSplitSchema = z.object({
  partnerId: cuid,
  sharePercentage,
});

export type ProjectSplitInput = z.infer<typeof projectSplitSchema>;

/**
 * Optional out-of-pocket costs known up-front, persisted as ProjectExpense
 * rows (pending reimbursement) at creation time.
 */
export const initialExpenseSchema = z.object({
  title: z.string().trim().min(1, "Expense title is required").max(500),
  amount: moneyAmount,
  paidByPartnerId: cuid,
});

export type InitialExpenseInput = z.infer<typeof initialExpenseSchema>;

/**
 * Create project. `splits` is the PER-PROJECT snapshot written to
 * ProjectPartner — copied from defaults on the client, then adjustable.
 * Historic rows never mutate when global defaults change.
 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(150),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  contractValue: moneyAmount,
  status: projectStatusSchema.default("ACTIVE"),
  splits: z
    .array(projectSplitSchema)
    .min(1, "At least one partner split is required")
    .refine((rows) => sharesSumTo100(rows.map((r) => r.sharePercentage)), {
      message: "Project equity splits must sum to exactly 100%.",
    }),
  initialExpenses: z.array(initialExpenseSchema).max(50).default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Adjust a project's snapshot equity (historic-safe: only this project). */
export const updateProjectSplitsSchema = z.object({
  projectId: cuid,
  splits: z
    .array(projectSplitSchema)
    .min(1, "At least one partner split is required")
    .refine((rows) => sharesSumTo100(rows.map((r) => r.sharePercentage)), {
      message: "Project equity splits must sum to exactly 100%.",
    }),
});

export type UpdateProjectSplitsInput = z.infer<
  typeof updateProjectSplitsSchema
>;

export const updateProjectSchema = z.object({
  projectId: cuid,
  name: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  contractValue: moneyAmount.optional(),
  status: projectStatusSchema.optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/* --------------------------- Client payments -------------------------- */

export const clientPaymentSchema = z.object({
  projectId: cuid,
  amount: moneyAmount,
  milestoneLabel: z.string().trim().max(150).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  paidAt: z.coerce.date().default(() => new Date()),
  /// Partner who physically received the cash/transfer into custody.
  receivedByPartnerId: cuid,
});

export type ClientPaymentInput = z.infer<typeof clientPaymentSchema>;

/* ---------------------------- Expense schemas ------------------------- */

export const expenseSchema = z
  .object({
    projectId: cuid.optional().or(z.literal("")).nullable(),
    paidById: z.string().trim().nullable().optional(),
    paidByPartnerId: z.string().trim().nullable().optional(),
    amount: moneyAmount,
    description: z.string().trim().min(1, "Description is required").max(500),
    expenseDate: z.coerce.date().default(() => new Date()),
    deductFromCustody: z.boolean().default(false),
    expenseIds: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      // If it's a project direct expense, it can be paid from contract funds without a partner payer
      const isProjectExpense = Boolean(data.projectId && data.projectId.trim().length > 0);
      if (isProjectExpense) return true;
      // General firm expenses require a valid partner payer
      const payer = (data.paidById || data.paidByPartnerId || "").trim();
      return Boolean(payer && payer !== CLIENT_PAYER);
    },
    {
      message: "Paying partner is required",
      path: ["paidById"],
    },
  );

export type ExpenseInput = z.infer<typeof expenseSchema>;

export const projectExpenseSchema = z.object({
  projectId: cuid,
  paidById: z.string().trim().nullable().optional(),
  paidByPartnerId: z.string().trim().nullable().optional(),
  amount: moneyAmount,
  description: z.string().trim().min(1, "Description is required").max(500),
  expenseDate: z.coerce.date().default(() => new Date()),
  deductFromCustody: z.boolean().default(false),
  expenseIds: z.array(z.string()).optional(),
});

export type ProjectExpenseInput = z.infer<typeof projectExpenseSchema>;

export const markReimbursedSchema = z.object({
  expenseId: cuid,
  isReimbursed: z.boolean(),
});

export type MarkReimbursedInput = z.infer<typeof markReimbursedSchema>;

/* ---------------------------- Partner drawing ------------------------- */

export const partnerDrawingSchema = z.object({
  partnerId: cuid,
  amount: moneyAmount,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  drawnAt: z.coerce.date().default(() => new Date()),
});

export type PartnerDrawingInput = z.infer<typeof partnerDrawingSchema>;

const nonNegativeMoney = z
  .coerce
  .number()
  .min(0, "Amount cannot be negative")
  .max(1_000_000_000, "Amount is unreasonably large");

export const companyExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  amount: moneyAmount,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  expenseDate: z.coerce.date().default(() => new Date()),
  billingMonth: z.string().trim().max(20).optional().or(z.literal("")).nullable(),
  vaultAmount: nonNegativeMoney.default(0),
  vaultNotes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CompanyExpenseInput = z.infer<typeof companyExpenseSchema>;

export const updateCompanyExpenseSchema = z.object({
  id: cuid,
  title: z.string().trim().min(1, "Title is required").max(200),
  amount: moneyAmount,
  notes: z.string().trim().max(1000).optional().or(z.literal("")).nullable(),
  expenseDate: z.coerce.date().default(() => new Date()),
  billingMonth: z.string().trim().max(20).optional().or(z.literal("")).nullable(),
  vaultAmount: nonNegativeMoney.default(0),
  vaultNotes: z.string().trim().max(500).optional().or(z.literal("")).nullable(),
  kind: z.enum(["FIXED", "VARIABLE"]).default("VARIABLE"),
});

export type UpdateCompanyExpenseInput = z.infer<
  typeof updateCompanyExpenseSchema
>;

export const updateCompanyPaymentSchema = z.object({
  paymentId: cuid,
  amount: moneyAmount,
  paidAt: z.coerce.date().optional(),
});

export type UpdateCompanyPaymentInput = z.infer<
  typeof updateCompanyPaymentSchema
>;

export const disburseCompanyVaultExpenseSchema = z.object({
  expenseId: cuid,
});

export type DisburseCompanyVaultExpenseInput = z.infer<
  typeof disburseCompanyVaultExpenseSchema
>;

export const companyPaymentSchema = z.object({
  expenseId: cuid,
  partnerId: cuid,
  amount: moneyAmount,
  paidAt: z.coerce.date().default(() => new Date()),
});

export type CompanyPaymentInput = z.infer<typeof companyPaymentSchema>;

/** Cash the firm pays BACK to a partner (settles their company credit). */
export const companyPayoutSchema = z.object({
  partnerId: cuid,
  expenseId: cuid.optional().or(z.literal("")),
  /// Optional: when a partner (not company vault) physically hands cash to the recipient.
  paidByPartnerId: cuid.optional().or(z.literal("")),
  amount: moneyAmount,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  paidAt: z.coerce.date().default(() => new Date()),
});

export type CompanyPayoutInput = z.infer<typeof companyPayoutSchema>;

/** One-click settlement of a single partner row on a company bill. */
export const settleCompanyRowSchema = z.object({
  expenseId: cuid,
  partnerId: cuid,
});

export type SettleCompanyRowInput = z.infer<typeof settleCompanyRowSchema>;

/** One-click settlement of EVERY row on a company bill. */
export const settleCompanyBillSchema = z.object({
  expenseId: cuid,
});

export type SettleCompanyBillInput = z.infer<typeof settleCompanyBillSchema>;

/** Create a bill together with its initial payer split (atomic). */
export const companyExpenseWithPaymentsSchema = companyExpenseSchema.extend({
  kind: z.enum(["FIXED", "VARIABLE"]).default("VARIABLE"),
  payments: z
    .array(
      z.object({
        partnerId: cuid,
        amount: moneyAmount,
      }),
    )
    .max(20)
    .default([]),
});

export type CompanyExpenseWithPaymentsInput = z.infer<
  typeof companyExpenseWithPaymentsSchema
>;

/* ------------------------- Fixed company costs ------------------------ */

export const companyFixedCostSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  amount: moneyAmount,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

/* ------------------------- Settlements & Vault ------------------------- */

export const executeSettlementSchema = z.object({
  scope: z.enum(["ALL", "PROJECT"]),
  projectId: z.string().optional().nullable(),
  totalAmount: moneyAmount,
  vaultPercentage: z.number().min(0).max(100).default(0),
  settledAt: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExecuteSettlementInput = z.infer<typeof executeSettlementSchema>;

/* ------------------------- Generic action result ---------------------- */

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
