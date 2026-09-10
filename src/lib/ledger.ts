/**
 * Partner Ledger Calculation Engine
 * ---------------------------------
 * 100% pure functions — no DB, no I/O, no Date.now().
 * All money inputs are plain `number`s. Convert Prisma `Decimal`
 * to number at the boundary (see `toNumber`).
 *
 * Business rules implemented:
 *  1. Realized Net Profit (per project) = Total Inflow − Total Operational Expenses
 *  2. When client payments arrive, OUTSTANDING out-of-pocket expenses are
 *     settled/reimbursed FIRST, before net profit is considered distributable.
 *  3. Net profit is split per the project's SNAPSHOT equity
 *     (ProjectPartner.sharePercentage — historic, immutable).
 *  4. Partner Balance =
 *       (Pending Reimbursable Expenses)
 *     + (Realized Net Profit Shares across ALL projects)
 *     − (Total Drawings Taken)
 */

export interface LedgerSplit {
  partnerId: string;
  sharePercentage: number;
}

export interface LedgerPayment {
  amount: number;
}

export interface LedgerExpense {
  amount: number;
  paidByPartnerId: string;
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
  const totalExpenses = round2(sum(project.expenses.map((e) => e.amount)));
  const reimbursedTotal = round2(
    sum(project.expenses.filter((e) => e.isReimbursed).map((e) => e.amount)),
  );
  const outstandingReimbursements = round2(
    sum(project.expenses.filter((e) => !e.isReimbursed).map((e) => e.amount)),
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

  // 1 — reimbursements due, grouped by payer
  const owed = new Map<string, number>();
  for (const e of project.expenses) {
    if (!e.isReimbursed) {
      owed.set(
        e.paidByPartnerId,
        round2((owed.get(e.paidByPartnerId) ?? 0) + e.amount),
      );
    }
  }
  const reimbursementsDue: ReimbursementDue[] = [...owed.entries()].map(
    ([partnerId, amount]) => ({ partnerId, amount: round2(amount) }),
  );

  // 2 — profit split by snapshot equity
  const profitShares: ProfitShare[] = project.projectPartners.map((s) => ({
    partnerId: s.partnerId,
    sharePercentage: s.sharePercentage,
    amount: round2((financials.netProfit * s.sharePercentage) / 100),
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
  /**
   * THE dynamic balance:
   * pendingReimbursements + realizedProfitShare − totalDrawings.
   * Positive = firm owes partner. Negative = partner owes firm / overdrawn.
   */
  balance: number;
  breakdown: PartnerProjectBreakdown[];
}

/**
 * Live financial summary for ONE partner across all projects + drawings.
 */
export function getPartnerLedger(
  partner: LedgerPartner,
  projects: LedgerProject[],
  drawings: LedgerDrawing[],
  projectNames?: Record<string, string>,
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
    const profitShare = round2(
      (financials.netProfit * sharePercentage) / 100,
    );

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

  const balance = round2(
    pendingReimbursements + realizedProfitShare - totalDrawings,
  );

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    pendingReimbursements,
    realizedProfitShare,
    totalDrawings,
    balance,
    breakdown,
  };
}

/** Live summaries for EVERY partner (sorted by balance desc). */
export function getAllPartnerLedgers(
  partners: LedgerPartner[],
  projects: LedgerProject[],
  drawings: LedgerDrawing[],
  projectNames?: Record<string, string>,
): PartnerLedger[] {
  return partners
    .map((p) => getPartnerLedger(p, projects, drawings, projectNames))
    .sort((a, b) => b.balance - a.balance);
}

/* ------------------------------ firm-wide ----------------------------- */

export interface FirmOverview {
  totalContractValue: number;
  totalInflow: number;
  totalExpenses: number;
  outstandingReimbursements: number;
  netProfit: number;
  totalDrawings: number;
  partnerBalancesTotal: number;
  projectCount: number;
  activePartnerCount: number;
}

export function getFirmOverview(
  projects: (LedgerProject & { contractValue?: number })[],
  drawings: LedgerDrawing[],
  ledgers?: PartnerLedger[],
): FirmOverview {
  const totalContractValue = round2(
    sum(projects.map((p) => p.contractValue ?? 0)),
  );
  const totalInflow = round2(
    sum(projects.flatMap((p) => p.clientPayments.map((x) => x.amount))),
  );
  const totalExpenses = round2(
    sum(projects.flatMap((p) => p.expenses.map((x) => x.amount))),
  );
  const outstandingReimbursements = round2(
    sum(
      projects.flatMap((p) =>
        p.expenses.filter((e) => !e.isReimbursed).map((e) => e.amount),
      ),
    ),
  );
  const netProfit = round2(totalInflow - totalExpenses);
  const totalDrawings = round2(sum(drawings.map((d) => d.amount)));
  const partnerBalancesTotal = ledgers
    ? round2(sum(ledgers.map((l) => l.balance)))
    : round2(netProfit + outstandingReimbursements - totalDrawings);

  return {
    totalContractValue,
    totalInflow,
    totalExpenses,
    outstandingReimbursements,
    netProfit,
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
