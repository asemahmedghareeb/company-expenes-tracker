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

export interface TreasuryProject {
  id: string;
  name?: string;
  splits: TreasurySplit[];
  payments: TreasuryPayment[];
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
  /** Σ payments where receivedByPartnerId === partner. */
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
    for (const pay of project.payments) {
      heldBy.set(
        pay.receivedByPartnerId,
        round2((heldBy.get(pay.receivedByPartnerId) ?? 0) + pay.amount),
      );
      for (const [pid, part] of splitPayment(pay.amount, project.splits)) {
        earnedBy.set(pid, round2((earnedBy.get(pid) ?? 0) + part));
      }
    }
    const involved = new Set([...heldBy.keys(), ...earnedBy.keys()]);
    for (const pid of involved) {
      const row = byId.get(pid);
      // Receiver/split member outside the current partner list (e.g. a
      // deactivated partner hidden from the listing) still moves cash, but
      // has no row to attribute — skip defensively, totals stay exact.
      if (!row) continue;
      const held = heldBy.get(pid) ?? 0;
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
