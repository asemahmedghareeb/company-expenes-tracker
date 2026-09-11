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
      clientPayments: {
        orderBy: { paidAt: "desc" },
        include: { receivedBy: true },
      },
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
    paidByPartnerId: string | null;
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
export async function getDashboardData(range?: {
  from: Date;
  toExclusive: Date;
}) {
  // Half-open UTC window. When omitted → all time (legacy behavior).
  // Scoping convention (matches the summary page): every dated record is
  // grouped by its OWN date — bills by expenseDate (payments follow their
  // bill), client payments by paidAt, project costs by expenseDate,
  // drawings by drawnAt, projects by createdAt.
  const window =
    range !== undefined
      ? { gte: range.from, lt: range.toExclusive }
      : undefined;
  const [partners, projectsRaw, drawingsRaw, companyRaw, fixedCostsRaw] = await Promise.all([
    db.partner.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({
      where: window ? { createdAt: window } : undefined,
      include: {
        projectPartners: true,
        clientPayments: window ? { where: { paidAt: window } } : true,
        expenses: window ? { where: { expenseDate: window } } : true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.partnerDrawing.findMany(
      window ? { where: { drawnAt: window } } : undefined,
    ),
    db.companyExpense.findMany({
      where: window ? { expenseDate: window } : undefined,
      include: { payments: true, payouts: true },
      orderBy: { expenseDate: "desc" },
    }),
    db.companyFixedCost.findMany({ orderBy: { title: "asc" } }),
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
  const company = {
    expenses: companyRaw.map((e) => ({
      id: e.id,
      title: e.title,
      amount: toNumber(e.amount),
      payments: e.payments.map((x) => ({
        partnerId: x.partnerId,
        amount: toNumber(x.amount),
      })),
      payouts: e.payouts
        .filter((x) => x.expenseId === e.id)
        .map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
          expenseId: x.expenseId ?? undefined,
        })),
    })),
    loosePayouts: companyRaw.flatMap((e) =>
      e.payouts
        .filter((x) => !x.expenseId)
        .map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
        })),
    ),
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      defaultSharePercentage: p.defaultSharePercentage,
      isActive: p.isActive,
    })),
  };

  const ledgers = getAllPartnerLedgers(
    partners.map((p) => ({ id: p.id, name: p.name })),
    projects,
    drawings,
    Object.fromEntries(projectsRaw.map((p) => [p.id, p.name])),
    company,
  );

  const fixedTotal = toNumber(
    companyRaw
      .filter((e) => e.kind === "FIXED")
      .reduce((a, e) => a + toNumber(e.amount), 0),
  );
  const variableTotal = toNumber(
    companyRaw
      .filter((e) => e.kind !== "FIXED")
      .reduce((a, e) => a + toNumber(e.amount), 0),
  );

  const overview = getFirmOverview(projects, drawings, ledgers, {
    fixedTotal,
    variableTotal,
  });
  overview.activePartnerCount = partners.filter((p) => p.isActive).length;

  const projectCards = projectsRaw.map((p, i) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    contractValue: toNumber(p.contractValue),
    financials: getProjectFinancials(projects[i]!, toNumber(p.contractValue)),
    partnerCount: p.projectPartners.length,
  }));

  const fixedCosts = fixedCostsRaw.map((f) => ({
    id: f.id,
    title: f.title,
    amount: toNumber(f.amount),
  }));

  const toBillLine = (e: (typeof companyRaw)[number]) => ({
    id: e.id,
    title: e.title,
    amount: toNumber(e.amount),
    kind: e.kind as "FIXED" | "VARIABLE",
    expenseDate: e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate),
  });

  const partnerNameById = Object.fromEntries(partners.map((p) => [p.id, p.name]));
  const projectExpenses = projectsRaw
    .flatMap((p) =>
      (p.expenses ?? [])
        .filter((e) => e.paidByPartnerId)
        .map((e) => ({
          id: e.id,
          title: e.description,
          amount: toNumber(e.amount),
          projectName: p.name,
          projectId: p.id,
          paidByName: (e.paidByPartnerId && partnerNameById[e.paidByPartnerId]) || "",
          isReimbursed: e.isReimbursed,
          expenseDate:
            e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate),
        })),
    )
    .sort((a, b) => +new Date(b.expenseDate) - +new Date(a.expenseDate))
    .slice(0, 8);

  return {
    partners,
    ledgers,
    overview,
    projectCards,
    drawings: drawingsRaw,
    fixedCosts,
    companyTotals: {
      fixed: fixedTotal,
      variable: variableTotal,
      total: toNumber(fixedTotal + variableTotal),
    },
    fixedBills: companyRaw.filter((e) => e.kind === "FIXED").slice(0, 8).map(toBillLine),
    variableBills: companyRaw.filter((e) => e.kind !== "FIXED").slice(0, 8).map(toBillLine),
    projectExpenses,
  };
}

/** Company page data: bills with payments + payouts + partners for settlement. */
export async function getCompanyData() {
  const [expenses, partners, fixedCosts, payouts] = await Promise.all([
    db.companyExpense.findMany({
      include: {
        payments: { include: { partner: true }, orderBy: { paidAt: "desc" } },
        payouts: { include: { partner: true }, orderBy: { paidAt: "desc" } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.partner.findMany({ orderBy: { name: "asc" } }),
    db.companyFixedCost.findMany({ orderBy: { title: "asc" } }),
    db.companyPayout.findMany({
      include: { partner: true, expense: true },
      orderBy: { paidAt: "desc" },
      take: 50,
    }),
  ]);
  return { expenses, partners, fixedCosts, payouts };
}

/** Treasury page data: every project with its frozen splits + custodied payments. */
export async function getTreasuryData() {
  const [partners, projects] = await Promise.all([
    db.partner.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        projectPartners: true,
        clientPayments: { orderBy: { paidAt: "desc" } },
      },
    }),
  ]);
  return { partners, projects };
}

/** Monthly summary data: everything the engine needs to settle one month. */
export async function getSummaryData() {
  const [company, projectCosts, partners] = await Promise.all([
    db.companyExpense.findMany({
      include: { payments: true },
      orderBy: { expenseDate: "desc" },
    }),
    db.projectExpense.findMany({
      include: { paidBy: true, project: true },
      orderBy: { expenseDate: "desc" },
    }),
    db.partner.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { company, projectCosts, partners };
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
    // Client-covered rows owe nobody — never appear as pending.
    where: { isReimbursed: false, paidByPartnerId: { not: null } },
    include: { paidBy: true, project: true },
    orderBy: { expenseDate: "desc" },
  });
  return { partners, ledgers, overview, drawings, pendingExpenses: expenses };
}
