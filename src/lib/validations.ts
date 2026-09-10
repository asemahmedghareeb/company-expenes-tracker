import { z } from "zod";
import {
  EQUITY_TOLERANCE,
  EQUITY_TOTAL,
  sharesSumTo100,
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
});

export type ClientPaymentInput = z.infer<typeof clientPaymentSchema>;

/* ---------------------------- Project expense ------------------------- */

export const projectExpenseSchema = z.object({
  projectId: cuid,
  paidByPartnerId: cuid,
  amount: moneyAmount,
  description: z.string().trim().min(1, "Description is required").max(500),
  expenseDate: z.coerce.date().default(() => new Date()),
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

/* ------------------------- Generic action result ---------------------- */

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}
