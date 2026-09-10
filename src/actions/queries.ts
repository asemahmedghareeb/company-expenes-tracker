"use server";

import { db } from "@/lib/db";
import {
  getAllPartnerLedgers,
  getFirmOverview,
  getProjectFinancials,
  getProjectSettlementPlan,
  toNumber,
  type LedgerDrawing,
  type LedgerProject,
} from "@/lib/ledger";

/** Lightweight list for selects / tables. */
export async function getPartners() {
  return db.partner.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function getProjects() {
  return db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      projectPartners: { include: { partner: true } },
      clientPayments: true,
      expenses: true,
    },
  });
}

export async function getProjectDetail(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: {
      projectPartners: { include: { partner: true }, orderBy: { partner: { name: "asc" } } },
      clientPayments: { orderBy: { paidAt: "desc" } },
      expenses: {
        orderBy: { expenseDate: "desc" },
        include: { paidBy: true },
      },
    },
  });
  if (!project) return null;

  const ledgerProject: LedgerProject = {
    id: project.id,
    name: project.name,
    contractValue: toNumber(project.contractValue),
    projectPartners: project.projectPartners.map((s) => ({
      partnerId: s.partnerId,
      sharePercentage: s.sharePercentage,
    })),
    clientPayments: project.clientPayments.map((p) => ({
      amount: toNumber(p.amount),
    })),
    expenses: project.expenses.map((e) => ({
      amount: toNumber(e.amount),
      paidByPartnerId: e.paidByPartnerId,
      isReimbursed: e.isReimbursed,
    })),
  };

  const financials = getProjectFinancials(
    ledgerProject,
    toNumber(project.contractValue),
  );
  const settlement = getProjectSettlementPlan(
    ledgerProject,
    toNumber(project.contractValue),
  );

  return { project, financials, settlement };
}

function toLedgerProject(p: {
  id: string;
  name: string;
  contractValue: unknown;
  projectPartners: { partnerId: string; sharePercentage: number }[];
  clientPayments: { amount: unknown }[];
  expenses: {
    amount: unknown;
    paidByPartnerId: string;
    isReimbursed: boolean;
  }[];
}): LedgerProject {
  return {
    id: p.id,
    name: p.name,
    contractValue: toNumber(p.contractValue),
    projectPartners: p.projectPartners,
    clientPayments: p.clientPayments.map((x) => ({ amount: toNumber(x.amount) })),
    expenses: p.expenses.map((e) => ({
      amount: toNumber(e.amount),
      paidByPartnerId: e.paidByPartnerId,
      isReimbursed: e.isReimbursed,
    })),
  };
}

/** Full dashboard + ledger data, computed via the pure ledger engine. */
export async function getDashboardData() {
  const [partners, projectsRaw, drawingsRaw] = await Promise.all([
    db.partner.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({
      include: { projectPartners: true, clientPayments: true, expenses: true },
      orderBy: { createdAt: "desc" },
    }),
    db.partnerDrawing.findMany(),
  ]);

  const projects: LedgerProject[] = projectsRaw.map((p) =>
    toLedgerProject({
      id: p.id,
      name: p.name,
      contractValue: p.contractValue,
      projectPartners: p.projectPartners,
      clientPayments: p.clientPayments,
      expenses: p.expenses,
    }),
  );
  const drawings: LedgerDrawing[] = drawingsRaw.map((d) => ({
    partnerId: d.partnerId,
    amount: toNumber(d.amount),
  }));

  const ledgers = getAllPartnerLedgers(
    partners.map((p) => ({ id: p.id, name: p.name })),
    projects,
    drawings,
    Object.fromEntries(projectsRaw.map((p) => [p.id, p.name])),
  );

  const overview = getFirmOverview(projects, drawings, ledgers);
  overview.activePartnerCount = partners.filter((p) => p.isActive).length;

  const projectCards = projectsRaw.map((p, i) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    contractValue: toNumber(p.contractValue),
    financials: getProjectFinancials(projects[i]!, toNumber(p.contractValue)),
    partnerCount: p.projectPartners.length,
  }));

  return { partners, ledgers, overview, projectCards, drawings: drawingsRaw };
}

/** Partner ledger page data (ledgers + drawings detail). */
export async function getLedgerData() {
  const { partners, ledgers, overview } = await getDashboardData();
  const drawings = await db.partnerDrawing.findMany({
    include: { partner: true },
    orderBy: { drawnAt: "desc" },
    take: 100,
  });
  const expenses = await db.projectExpense.findMany({
    where: { isReimbursed: false },
    include: { paidBy: true, project: true },
    orderBy: { expenseDate: "desc" },
  });
  return { partners, ledgers, overview, drawings, pendingExpenses: expenses };
}
