/**
 * Partner Ledger Calculation Engine
 * ---------------------------------
 * 100% pure functions — no DB, no I/O, no Date.now().
 * All money inputs are plain `number`s. Convert Prisma `Decimal`
 * to number at the boundary (see `toNumber`).
 *
 * Money splits use largest-remainder (`splitMoney`) so per-partner
 * 2-decimal parts ALWAYS sum exactly to the total (no 0.01 dust).
 *
 * Business rules implemented:
 *  1. Realized Net Profit (per project) = Total Inflow − Total Operational Expenses
 *  2. When client payments arrive, OUTSTANDING out-of-pocket expenses are
 *     settled/reimbursed FIRST, before net profit is considered distributable.
 *  3. Net profit is split per the project's SNAPSHOT equity
 *     (ProjectPartner.sharePercentage — historic, immutable).
 *  4. Company overhead (rent, subscriptions…) is split per ACTIVE partners'
 *     global default equity; whoever pays MORE than their share is credited
 *     (overpayment behaves like pending money the firm owes back).
 *  5. Partner Balance =
 *       (Pending Reimbursable Expenses)
 *     + (Realized Net Profit Shares across ALL projects)
 *     + (Company over/under-payments net)
 *     − (Total Drawings Taken)
 */

import { splitMoney } from "./shares";

export interface LedgerSplit {
  partnerId: string;
  sharePercentage: number;
}

export interface LedgerPayment {
  amount: number;
}

export interface LedgerExpense {
  amount: number;
  /** Null = covered directly by the client (firm never owed it). */
  paidByPartnerId: string | null;
  isReimbursed: boolean;
}

export interface LedgerDrawing {
  partnerId: string;
  amount: number;
}

export interface LedgerProject {
  id: string;
  name?: string;
  contractValue?: number;
  projectPartners: LedgerSplit[];
  clientPayments: LedgerPayment[];
  expenses: LedgerExpense[];
}

export interface LedgerPartner {
  id: string;
  name: string;
}

/* ------------------------------- utils ------------------------------- */

/** Round to 2dp (bank-friendly half-up via EPSILON guard). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Safely convert Prisma Decimal | string | number → number. */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v !== null && typeof v === "object" && "toNumber" in v) {
    return (v as { toNumber: () => number }).toNumber();
  }
  return Number(v ?? 0);
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/* --------------------------- project-level ---------------------------- */

export interface ProjectFinancials {
  projectId: string;
  totalInflow: number;
  totalExpenses: number;
  reimbursedTotal: number;
  outstandingReimbursements: number;
  /** Costs covered directly by the client — recorded, excluded from firm math. */
  clientCoveredTotal: number;
  /** Total Inflow − Total Operational Expenses */
  netProfit: number;
  /** Cash left in firm after reimbursing everyone owed (inflow − reimbursed − outstanding). */
  cashAfterReimbursements: number;
  /** What's actually available to distribute as profit (floored info, can be negative). */
  distributableProfit: number;
  collectionRate: number; // 0..1 vs contractValue (1 if no contract value set)
}

/**
 * Core project math. `contractValue` is optional — used only for collectionRate.
 */
export function getProjectFinancials(
  project: LedgerProject,
  contractValue?: number,
): ProjectFinancials {
  const totalInflow = round2(sum(project.clientPayments.map((p) => p.amount)));
  // Firm books only: partner-paid expenses. Client-covered costs never
  // touched the firm — no reimbursement owed, profit untouched.
  const firmExpenses = project.expenses.filter((e) => e.paidByPartnerId);
  const totalExpenses = round2(sum(firmExpenses.map((e) => e.amount)));
  const reimbursedTotal = round2(
    sum(firmExpenses.filter((e) => e.isReimbursed).map((e) => e.amount)),
  );
  const outstandingReimbursements = round2(
    sum(firmExpenses.filter((e) => !e.isReimbursed).map((e) => e.amount)),
  );
  const clientCoveredTotal = round2(
    sum(project.expenses.filter((e) => !e.paidByPartnerId).map((e) => e.amount)),
  );
  const netProfit = round2(totalInflow - totalExpenses);
  const cashAfterReimbursements = round2(
    totalInflow - reimbursedTotal - outstandingReimbursements,
  );
  // Settle-expenses-first: distributable profit is net profit, but it is only
  // *payable* to the extent cash remains after reimbursements.
  // We still report the full earned share (netProfit split); cash coverage is
  // visible via cashAfterReimbursements.
  const distributableProfit = netProfit;
  const cv = contractValue ?? project.contractValue ?? 0;
  const collectionRate =
    cv > 0 ? Math.min(1, Math.max(0, totalInflow / cv)) : 1;

  return {
    projectId: project.id,
    totalInflow,
    totalExpenses,
    reimbursedTotal,
    outstandingReimbursements,
    clientCoveredTotal,
    netProfit,
    cashAfterReimbursements,
    distributableProfit,
    collectionRate: round2(collectionRate),
  };
}

export interface ProfitShare {
  partnerId: string;
  sharePercentage: number;
  amount: number;
}

export interface ReimbursementDue {
  partnerId: string;
  amount: number;
}

export interface ProjectSettlementPlan {
  projectId: string;
  financials: ProjectFinancials;
  /** Who must be reimbursed, and how much (settle FIRST). */
  reimbursementsDue: ReimbursementDue[];
  /** Net profit split per snapshot equity (settle SECOND). */
  profitShares: ProfitShare[];
  /** Total each partner is owed from THIS project (reimbursement + profit). */
  totalOwedPerPartner: { partnerId: string; amount: number }[];
}

/**
 * Settlement order for a project:
 *   1. Reimburse every outstanding out-of-pocket expense to the payer.
 *   2. Split realized net profit by ProjectPartner.sharePercentage.
 */
export function getProjectSettlementPlan(
  project: LedgerProject,
  contractValue?: number,
): ProjectSettlementPlan {
  const financials = getProjectFinancials(project, contractValue);

  // 1 — reimbursements due, grouped by payer (client-covered rows owe nobody)
  const owed = new Map<string, number>();
  for (const e of project.expenses) {
    if (!e.isReimbursed && e.paidByPartnerId) {
      owed.set(
        e.paidByPartnerId,
        round2((owed.get(e.paidByPartnerId) ?? 0) + e.amount),
      );
    }
  }
  const reimbursementsDue: ReimbursementDue[] = [...owed.entries()].map(
    ([partnerId, amount]) => ({ partnerId, amount: round2(amount) }),
  );

  // 2 — profit split by snapshot equity (largest-remainder: parts sum to netProfit)
  const profitParts = splitMoney(
    financials.netProfit,
    project.projectPartners.map((s) => s.sharePercentage),
  );
  const profitShares: ProfitShare[] = project.projectPartners.map((s, i) => ({
    partnerId: s.partnerId,
    sharePercentage: s.sharePercentage,
    amount: profitParts[i] ?? 0,
  }));

  // Combined per-partner totals for this project
  const combined = new Map<string, number>();
  for (const r of reimbursementsDue)
    combined.set(r.partnerId, round2((combined.get(r.partnerId) ?? 0) + r.amount));
  for (const p of profitShares)
    combined.set(p.partnerId, round2((combined.get(p.partnerId) ?? 0) + p.amount));
  // Ensure every split partner appears even with zero
  for (const s of project.projectPartners) {
    if (!combined.has(s.partnerId)) combined.set(s.partnerId, 0);
  }
  const totalOwedPerPartner = [...combined.entries()].map(
    ([partnerId, amount]) => ({ partnerId, amount: round2(amount) }),
  );

  return {
    projectId: project.id,
    financials,
    reimbursementsDue,
    profitShares,
    totalOwedPerPartner,
  };
}

/* ---------------------------- partner-level --------------------------- */

export interface PartnerProjectBreakdown {
  projectId: string;
  projectName?: string;
  sharePercentage: number;
  pendingReimbursement: number;
  profitShare: number;
  totalOwed: number;
}

export interface PartnerLedger {
  partnerId: string;
  partnerName: string;
  /** Sum of isReimbursed=false expenses this partner paid (firm still owes them). */
  pendingReimbursements: number;
  /** Sum of (netProfit × snapshot share) across ALL projects (can be negative). */
  realizedProfitShare: number;
  /** Sum of all cash withdrawals. */
  totalDrawings: number;
  /** Σ(paid − share − payouts) across company overhead (positive = firm owes them). */
  companyNet: number;
  /**
   * THE dynamic balance:
   * pendingReimbursements + realizedProfitShare + companyNet − totalDrawings.
   * Positive = firm owes partner. Negative = partner owes firm / overdrawn.
   */
  balance: number;
  breakdown: PartnerProjectBreakdown[];
  companyBreakdown: CompanyNetLine[];
}

export interface CompanyPartnerInput {
  id: string;
  name: string;
  defaultSharePercentage: number;
  isActive: boolean;
}

export interface CompanyPaymentInput {
  partnerId: string;
  amount: number;
}

/** Cash the firm paid BACK to a partner (settles their pending credit). */
export interface CompanyPayoutInput {
  partnerId: string;
  amount: number;
  expenseId?: string;
}

export interface CompanyExpenseInput {
  id: string;
  title?: string;
  amount: number;
  payments: CompanyPaymentInput[];
  /** Firm→partner payouts (empty when the caller has none to report). */
  payouts?: CompanyPayoutInput[];
}

export interface CompanyPartnerSettlement {
  partnerId: string;
  name: string;
  sharePercentage: number;
  shareAmount: number;
  paid: number;
  /** Firm→partner payouts credited against this row. */
  payout: number;
  /** paid − shareAmount − payout. Positive = firm still owes them. */
  net: number;
}

export interface CompanyExpenseSettlement {
  expenseId: string;
  title?: string;
  amount: number;
  totalPaid: number;
  totalPayout: number;
  /** amount − totalPaid. Positive = still to collect from partners. */
  remaining: number;
  rows: CompanyPartnerSettlement[];
}

export interface CompanyNetLine {
  expenseId: string;
  title?: string;
  share: number;
  paid: number;
  payout: number;
  net: number;
}

/**
 * Settle ONE company bill across ACTIVE partners by default equity.
 * Overpayers earn pending credit; underpayers show what they still owe.
 */
export function getCompanyExpenseSettlement(
  expense: CompanyExpenseInput,
  partners: CompanyPartnerInput[],
): CompanyExpenseSettlement {
  const active = partners.filter((p) => p.isActive);
  // Largest-remainder: share parts sum EXACTLY to the bill (no 0.01 dust).
  const shareParts = splitMoney(
    expense.amount,
    active.map((p) => p.defaultSharePercentage),
  );
  const rows = active.map((p, i) => {
    const paid = round2(
      sum(expense.payments.filter((x) => x.partnerId === p.id).map((x) => x.amount)),
    );
    // Callers scope payouts to this bill; the expenseId guard is defensive.
    const payout = round2(
      sum(
        (expense.payouts ?? [])
          .filter(
            (x) =>
              x.partnerId === p.id &&
              (!x.expenseId || x.expenseId === expense.id),
          )
          .map((x) => x.amount),
      ),
    );
    const shareAmount = shareParts[i] ?? 0;
    return {
      partnerId: p.id,
      name: p.name,
      sharePercentage: p.defaultSharePercentage,
      shareAmount,
      paid,
      payout,
      net: round2(paid - shareAmount - payout),
    };
  });
  const totalPaid = round2(sum(expense.payments.map((x) => x.amount)));
  const totalPayout = round2(sum((expense.payouts ?? []).map((x) => x.amount)));
  return {
    expenseId: expense.id,
    title: expense.title,
    amount: expense.amount,
    totalPaid,
    totalPayout,
    remaining: round2(expense.amount - totalPaid),
    rows,
  };
}

/**
 * Per-partner net across ALL company bills: paid − share − payouts (signed).
 * `loosePayouts` = firm→partner payouts not linked to any bill.
 */
export function getPartnerCompanyNet(
  partnerId: string,
  expenses: CompanyExpenseInput[],
  partners: CompanyPartnerInput[],
  loosePayouts: CompanyPayoutInput[] = [],
): {
  share: number;
  paid: number;
  payout: number;
  net: number;
  lines: CompanyNetLine[];
} {
  let share = 0;
  let paid = 0;
  let payout = 0;
  const lines: CompanyNetLine[] = [];
  for (const e of expenses) {
    const s = getCompanyExpenseSettlement(e, partners);
    const row = s.rows.find((r) => r.partnerId === partnerId);
    if (!row) continue;
    share = round2(share + row.shareAmount);
    paid = round2(paid + row.paid);
    payout = round2(payout + row.payout);
    if (row.shareAmount > 0 || row.paid > 0 || row.payout > 0) {
      lines.push({
        expenseId: e.id,
        title: e.title,
        share: row.shareAmount,
        paid: row.paid,
        payout: row.payout,
        net: row.net,
      });
    }
  }
  for (const x of loosePayouts) {
    if (x.partnerId !== partnerId) continue;
    payout = round2(payout + x.amount);
    lines.push({
      expenseId: "",
      title: undefined,
      share: 0,
      paid: 0,
      payout: round2(x.amount),
      net: round2(-x.amount),
    });
  }
  return { share, paid, payout, net: round2(paid - share - payout), lines };
}

/**
 * Live financial summary for ONE partner across all projects + drawings.
 */
export function getPartnerLedger(
  partner: LedgerPartner,
  projects: LedgerProject[],
  drawings: LedgerDrawing[],
  projectNames?: Record<string, string>,
  company?: {
    expenses: CompanyExpenseInput[];
    partners: CompanyPartnerInput[];
    loosePayouts?: CompanyPayoutInput[];
  },
): PartnerLedger {
  let pendingReimbursements = 0;
  let realizedProfitShare = 0;
  const breakdown: PartnerProjectBreakdown[] = [];

  for (const project of projects) {
    const split = project.projectPartners.find(
      (s) => s.partnerId === partner.id,
    );
    const sharePercentage = split?.sharePercentage ?? 0;

    const pending = round2(
      sum(
        project.expenses
          .filter((e) => e.paidByPartnerId === partner.id && !e.isReimbursed)
          .map((e) => e.amount),
      ),
    );

    const financials = getProjectFinancials(project);
    // Same slice as getProjectSettlementPlan (largest-remainder, exact sum).
    const profitParts = splitMoney(
      financials.netProfit,
      project.projectPartners.map((s) => s.sharePercentage),
    );
    const profitShare = split
      ? (profitParts[
          project.projectPartners.findIndex((s) => s.partnerId === partner.id)
        ] ?? 0)
      : 0;

    pendingReimbursements = round2(pendingReimbursements + pending);
    // Only accrue profit if the partner is on this project's split.
    // (Partners with 0% on a project earn nothing from it.)
    realizedProfitShare = round2(
      realizedProfitShare + (split ? profitShare : 0),
    );

    if (split || pending > 0) {
      breakdown.push({
        projectId: project.id,
        projectName: project.name ?? projectNames?.[project.id],
        sharePercentage,
        pendingReimbursement: pending,
        profitShare: split ? profitShare : 0,
        totalOwed: round2(pending + (split ? profitShare : 0)),
      });
    }
  }

  const totalDrawings = round2(
    sum(drawings.filter((d) => d.partnerId === partner.id).map((d) => d.amount)),
  );

  // Company overhead nets (overpayments behave like pending credit).
  let companyNet = 0;
  let companyBreakdown: CompanyNetLine[] = [];
  if (company) {
    const c = getPartnerCompanyNet(
      partner.id,
      company.expenses,
      company.partners,
      company.loosePayouts ?? [],
    );
    companyNet = c.net;
    companyBreakdown = c.lines;
  }

  const balance = round2(
    pendingReimbursements + realizedProfitShare + companyNet - totalDrawings,
  );

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    pendingReimbursements,
    realizedProfitShare,
    totalDrawings,
    companyNet,
    balance,
    breakdown,
    companyBreakdown,
  };
}

/** Live summaries for EVERY partner (sorted by balance desc). */
export function getAllPartnerLedgers(
  partners: LedgerPartner[],
  projects: LedgerProject[],
  drawings: LedgerDrawing[],
  projectNames?: Record<string, string>,
  company?: { expenses: CompanyExpenseInput[]; partners: CompanyPartnerInput[] },
): PartnerLedger[] {
  return partners
    .map((p) => getPartnerLedger(p, projects, drawings, projectNames, company))
    .sort((a, b) => b.balance - a.balance);
}

/* ------------------------------ firm-wide ----------------------------- */

export interface FirmOverview {
  totalContractValue: number;
  totalInflow: number;
  totalExpenses: number;
  outstandingReimbursements: number;
  clientCoveredTotal: number;
  netProfit: number;
  /** Σ CompanyExpense where kind === FIXED (actual recorded bills). */
  totalFixedExpenses: number;
  /** Σ CompanyExpense where kind === VARIABLE. */
  totalVariableExpenses: number;
  /** Fixed + variable company overhead. */
  totalCompanyExpenses: number;
  /** Inflow − project expenses − fixed company expenses. */
  netProfitAfterFixed: number;
  /** Inflow − project expenses − all company overhead. */
  netProfitAfterCompany: number;
  totalDrawings: number;
  partnerBalancesTotal: number;
  projectCount: number;
  activePartnerCount: number;
}

export function getFirmOverview(
  projects: (LedgerProject & { contractValue?: number })[],
  drawings: LedgerDrawing[],
  ledgers?: PartnerLedger[],
  company?: { fixedTotal?: number; variableTotal?: number },
): FirmOverview {
  const totalContractValue = round2(
    sum(projects.map((p) => p.contractValue ?? 0)),
  );
  const totalInflow = round2(
    sum(projects.flatMap((p) => p.clientPayments.map((x) => x.amount))),
  );
  const totalExpenses = round2(
    sum(
      projects.flatMap((p) =>
        p.expenses.filter((x) => x.paidByPartnerId).map((x) => x.amount),
      ),
    ),
  );
  const outstandingReimbursements = round2(
    sum(
      projects.flatMap((p) =>
        p.expenses
          .filter((e) => !e.isReimbursed && e.paidByPartnerId)
          .map((e) => e.amount),
      ),
    ),
  );
  const clientCoveredTotal = round2(
    sum(
      projects.flatMap((p) =>
        p.expenses.filter((x) => !x.paidByPartnerId).map((x) => x.amount),
      ),
    ),
  );
  const netProfit = round2(totalInflow - totalExpenses);
  const totalFixedExpenses = round2(company?.fixedTotal ?? 0);
  const totalVariableExpenses = round2(company?.variableTotal ?? 0);
  const totalCompanyExpenses = round2(totalFixedExpenses + totalVariableExpenses);
  const netProfitAfterFixed = round2(netProfit - totalFixedExpenses);
  const netProfitAfterCompany = round2(netProfit - totalCompanyExpenses);
  const totalDrawings = round2(sum(drawings.map((d) => d.amount)));
  const partnerBalancesTotal = ledgers
    ? round2(sum(ledgers.map((l) => l.balance)))
    : round2(netProfit + outstandingReimbursements - totalDrawings);

  return {
    totalContractValue,
    totalInflow,
    totalExpenses,
    outstandingReimbursements,
    clientCoveredTotal,
    netProfit,
    totalFixedExpenses,
    totalVariableExpenses,
    totalCompanyExpenses,
    netProfitAfterFixed,
    netProfitAfterCompany,
    totalDrawings,
    partnerBalancesTotal,
    projectCount: projects.length,
    activePartnerCount: 0, // filled by caller when known
  };
}

/** Validate a split table sums to 100 (shared with Zod layer, float-safe). */
export function validateSplitsSum(
  splits: { sharePercentage: number }[],
): { ok: boolean; total: number } {
  const total = round2(sum(splits.map((s) => s.sharePercentage)));
  return { ok: Math.abs(total - 100) < 0.01, total };
}

/* ---------------------------- monthly summary --------------------------- */

/** Month key: "2026-09". */
export function monthKey(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const m = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`;
  return /^\d{4}-\d{2}$/.test(m) ? m : "";
}

export interface MonthlyCompanyBill {
  id: string;
  title?: string;
  amount: number;
  kind: "fixed" | "variable";
  expenseDate: string;
  payments: { partnerId: string; amount: number }[];
}

export interface MonthlyProjectCost {
  amount: number;
  paidByPartnerId: string | null;
  expenseDate: string;
  projectName?: string;
  title?: string;
}

export interface MonthlyPartnerRow {
  partnerId: string;
  name: string;
  sharePercentage: number;
  /** Partner's slice of the month total. */
  share: number;
  /** Everything they personally covered this month. */
  paid: number;
  /** paid − share. Positive = firm owes them (له), negative = they owe (عليه). */
  balance: number;
}

export interface MonthlyDetailLine {
  kind: "fixed" | "variable" | "project";
  title: string;
  amount: number;
  paidByName: string;
  date: string;
}

export interface MonthlySummary {
  month: string;
  fixedTotal: number;
  variableTotal: number;
  directTotal: number;
  monthTotal: number;
  rows: MonthlyPartnerRow[];
  details: MonthlyDetailLine[];
}

/**
 * Month-scoped settlement (firm-books basis: client-covered rows excluded).
 * Every cost is grouped by its OWN expense month; payments follow their bill.
 */
export function getMonthlySummary(
  month: string,
  args: {
    company: MonthlyCompanyBill[];
    projectCosts: MonthlyProjectCost[];
    partners: CompanyPartnerInput[];
    partnerNames?: Record<string, string>;
  },
): MonthlySummary {
  const bills = args.company.filter((e) => monthKey(e.expenseDate) === month);
  const costs = args.projectCosts.filter(
    (e) => monthKey(e.expenseDate) === month && e.paidByPartnerId,
  );

  const fixedTotal = round2(
    sum(bills.filter((e) => e.kind === "fixed").map((e) => e.amount)),
  );
  const variableTotal = round2(
    sum(bills.filter((e) => e.kind !== "fixed").map((e) => e.amount)),
  );
  const directTotal = round2(sum(costs.map((e) => e.amount)));
  const monthTotal = round2(fixedTotal + variableTotal + directTotal);

  const active = args.partners.filter((p) => p.isActive);
  // Largest-remainder: share parts sum EXACTLY to the month total.
  const monthShares = splitMoney(
    monthTotal,
    active.map((p) => p.defaultSharePercentage),
  );
  const rows: MonthlyPartnerRow[] = active.map((p, i) => {
    const share = monthShares[i] ?? 0;
    const paidCompany = sum(
      bills.flatMap((e) =>
        e.payments.filter((x) => x.partnerId === p.id).map((x) => x.amount),
      ),
    );
    const paidProjects = sum(
      costs.filter((e) => e.paidByPartnerId === p.id).map((e) => e.amount),
    );
    const paid = round2(paidCompany + paidProjects);
    return {
      partnerId: p.id,
      name: p.name,
      sharePercentage: p.defaultSharePercentage,
      share,
      paid,
      balance: round2(paid - share),
    };
  });

  const nameOf = (pid: string | null) =>
    (pid && args.partnerNames?.[pid]) ||
    args.partners.find((p) => p.id === pid)?.name ||
    "—";
  const details: MonthlyDetailLine[] = [
    ...bills.map((e) => ({
      kind: e.kind as "fixed" | "variable",
      title: e.title ?? e.id.slice(0, 8),
      amount: e.amount,
      paidByName: e.payments
        .map((x) => nameOf(x.partnerId))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join("، ") || "—",
      date: e.expenseDate,
    })),
    ...costs.map((e) => ({
      kind: "project" as const,
      title: e.title ?? e.projectName ?? "",
      amount: e.amount,
      paidByName: nameOf(e.paidByPartnerId),
      date: e.expenseDate,
    })),
  ];

  return { month, fixedTotal, variableTotal, directTotal, monthTotal, rows, details };
}
