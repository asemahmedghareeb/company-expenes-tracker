/**
 * Partner Cash Custody & Treasury Distribution Engine
 * --------------------------------------------------
 * 100% pure functions — no DB, no I/O, no Date.now().
 * All money inputs are plain `number`s (convert Prisma `Decimal`
 * at the boundary with `toNumber`).
 *
 * Concepts:
 * - Cash held (custody): Σ client payments physically received by a partner.
 * - Earned share: every client payment split across the project's FROZEN
 *   snapshot equity (ProjectPartner.sharePercentage) via largest-remainder
 *   `splitMoney`, so per-payment parts ALWAYS sum exactly to the payment.
 * - Net position: cashHeld − earnedShare.
 *     > 0 → partner holds excess firm money (owes partners).
 *     < 0 → partner is owed money held by others (receivable).
 *     = 0 → balanced.
 *
 * NOTE: custody tracks RECEIPTS only (who holds the cash). It is independent
 * of expenses, reimbursements and drawings — those live in the ledger engine.
 */

import { splitMoney } from "./shares";
import { round2 } from "./ledger";

export interface TreasuryPayment {
  amount: number;
  receivedByPartnerId: string;
}

export interface TreasurySplit {
  partnerId: string;
  sharePercentage: number;
}

export interface TreasuryExpense {
  amount: number;
  paidById?: string | null;
  deductFromCustody?: boolean;
}

export interface TreasuryProject {
  id: string;
  name?: string;
  splits: TreasurySplit[];
  payments: TreasuryPayment[];
  expenses?: TreasuryExpense[];
}

export interface TreasurySettlement {
  id: string;
  projectId?: string | null;
  totalAmount: number;
}

export interface TreasuryPartner {
  id: string;
  name: string;
}

export interface ProjectCustodyLine {
  projectId: string;
  projectName?: string;
  held: number;
  earned: number;
}

export interface PartnerCustody {
  partnerId: string;
  partnerName: string;
  /** Σ payments where receivedByPartnerId === partner minus custody expenses and settlements. */
  cashHeld: number;
  /** Σ (payment × frozen snapshot share) across all projects on the split. */
  earnedShare: number;
  /** cashHeld − earnedShare (signed). */
  net: number;
  perProject: ProjectCustodyLine[];
}

export interface TreasurySummary {
  totalCollected: number;
  rows: PartnerCustody[];
}

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * Earned-share slice of ONE payment for partners on the split.
 * Partners absent from the snapshot earn nothing from that payment.
 */
function splitPayment(
  amount: number,
  splits: TreasurySplit[],
): Map<string, number> {
  const parts = splitMoney(
    amount,
    splits.map((s) => s.sharePercentage),
  );
  const out = new Map<string, number>();
  splits.forEach((s, i) => out.set(s.partnerId, parts[i] ?? 0));
  return out;
}

export function getTreasurySummary(
  partners: TreasuryPartner[],
  projects: TreasuryProject[],
  settlements: TreasurySettlement[] = [],
): TreasurySummary {
  const rows: PartnerCustody[] = partners.map((p) => ({
    partnerId: p.id,
    partnerName: p.name,
    cashHeld: 0,
    earnedShare: 0,
    net: 0,
    perProject: [],
  }));
  const byId = new Map(rows.map((r) => [r.partnerId, r]));

  for (const project of projects) {
    // Accumulate per-project lines first so parts stay exact per payment.
    const heldBy = new Map<string, number>();
    const earnedBy = new Map<string, number>();

    // 1. Inflows: Client payments received by partners
    for (const pay of project.payments) {
      heldBy.set(
        pay.receivedByPartnerId,
        round2((heldBy.get(pay.receivedByPartnerId) ?? 0) + pay.amount),
      );
    }

    // 2. Outflows: Deduct expenses paid from project/contract custody
    const expenses = project.expenses ?? [];
    for (const exp of expenses) {
      if (!exp.deductFromCustody && exp.deductFromCustody !== undefined) continue;
      if (exp.paidById && heldBy.has(exp.paidById)) {
        heldBy.set(
          exp.paidById,
          round2((heldBy.get(exp.paidById) ?? 0) - exp.amount),
        );
      } else {
        // Unassigned contract expense: deduct from the partner(s) holding positive cash in this project
        let remainingExp = exp.amount;
        for (const [pid, held] of heldBy.entries()) {
          if (remainingExp <= 0) break;
          if (held > 0) {
            const deduct = Math.min(held, remainingExp);
            heldBy.set(pid, round2(held - deduct));
            remainingExp = round2(remainingExp - deduct);
          }
        }
        if (remainingExp > 0 && heldBy.size > 0) {
          const firstPid = heldBy.keys().next().value;
          if (firstPid) {
            heldBy.set(firstPid, round2((heldBy.get(firstPid) ?? 0) - remainingExp));
          }
        }
      }
    }

    // 3. Outflows: Deduct project settlements (cash already distributed/withdrawn out of custody)
    const projectSettlements = settlements.filter((s) => s.projectId === project.id);
    for (const s of projectSettlements) {
      let remainingSettled = s.totalAmount;
      for (const [pid, held] of heldBy.entries()) {
        if (remainingSettled <= 0) break;
        if (held > 0) {
          const deduct = Math.min(held, remainingSettled);
          heldBy.set(pid, round2(held - deduct));
          remainingSettled = round2(remainingSettled - deduct);
        }
      }
      if (remainingSettled > 0 && heldBy.size > 0) {
        const firstPid = heldBy.keys().next().value;
        if (firstPid) {
          heldBy.set(firstPid, round2((heldBy.get(firstPid) ?? 0) - remainingSettled));
        }
      }
    }

    // 4. Net remaining un-settled cash for this project = sum of net cash held
    const netProjectCash = round2(Math.max(0, sum([...heldBy.values()])));

    // 5. Split remaining un-settled cash among partners by frozen snapshot shares
    for (const [pid, part] of splitPayment(netProjectCash, project.splits)) {
      earnedBy.set(pid, round2((earnedBy.get(pid) ?? 0) + part));
    }

    const involved = new Set([...heldBy.keys(), ...earnedBy.keys()]);
    for (const pid of involved) {
      const row = byId.get(pid);
      if (!row) continue;
      const held = Math.max(0, heldBy.get(pid) ?? 0);
      const earned = earnedBy.get(pid) ?? 0;
      row.cashHeld = round2(row.cashHeld + held);
      row.earnedShare = round2(row.earnedShare + earned);
      if (held > 0 || earned > 0) {
        row.perProject.push({
          projectId: project.id,
          projectName: project.name,
          held,
          earned,
        });
      }
    }
  }

  // 6. Deduct general / scope='ALL' executed settlements (if any)
  const generalSettlements = settlements.filter((s) => !s.projectId);
  for (const s of generalSettlements) {
    let remaining = s.totalAmount;
    for (const row of rows) {
      if (remaining <= 0) break;
      if (row.cashHeld > 0) {
        const deduct = Math.min(row.cashHeld, remaining);
        row.cashHeld = round2(row.cashHeld - deduct);
        remaining = round2(remaining - deduct);
      }
    }
  }

  for (const row of rows) row.net = round2(row.cashHeld - row.earnedShare);
  const totalCollected = round2(sum(rows.map((r) => r.cashHeld)));

  return { totalCollected, rows };
}

export interface SettlementTransfer {
  fromPartnerId: string;
  fromName: string;
  toPartnerId: string;
  toName: string;
  amount: number;
}

/**
 * Simplify inter-partner debts into the minimal transfer list.
 * Debtors (net > 0, hold excess) pay creditors (net < 0, are owed).
 * Greedy largest-first in integer cents — always terminates because
 * Σ nets === 0 (every payment's earned parts sum to the payment).
 */
export function suggestSettlements(rows: PartnerCustody[]): SettlementTransfer[] {
  const debtors = rows
    .filter((r) => r.net > 0.005)
    .map((r) => ({ id: r.partnerId, name: r.partnerName, cents: Math.round(r.net * 100) }))
    .sort((a, b) => b.cents - a.cents);
  const creditors = rows
    .filter((r) => r.net < -0.005)
    .map((r) => ({ id: r.partnerId, name: r.partnerName, cents: Math.round(-r.net * 100) }))
    .sort((a, b) => b.cents - a.cents);

  const out: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const move = Math.min(d.cents, c.cents);
    if (move <= 0) break;
    out.push({
      fromPartnerId: d.id,
      fromName: d.name,
      toPartnerId: c.id,
      toName: c.name,
      amount: move / 100,
    });
    d.cents -= move;
    c.cents -= move;
    if (d.cents <= 0) i++;
    if (c.cents <= 0) j++;
  }
  return out;
}
