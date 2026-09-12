"use server";

import { prisma as db } from "@/lib/prisma";
import {
  getAllPartnerLedgers,
  getFirmOverview,
  getProjectCustodyBreakdown,
  getProjectFinancials,
  getProjectSettlementPlan,
  toNumber,
  type LedgerDrawing,
  type LedgerProject,
  type ProjectCustodySummary,
} from "@/lib/ledger";

/** Lightweight list for selects / tables. */
export async function getPartners() {
  return db.partner.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] });
}

export async function getProjects() {
  // List view only needs aggregates — select scalar amounts instead of
  // hydrating full relation graphs (no descriptions, dates, or joins).
  return db.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      contractValue: true,
      projectPartners: { select: { partnerId: true } },
      clientPayments: { select: { amount: true } },
      expenses: { select: { amount: true } },
    },
  });
}

export async function getProjectDetail(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      contractValue: true,
      status: true,
      projectPartners: {
        select: {
          partnerId: true,
          sharePercentage: true,
          partner: { select: { id: true, name: true } },
        },
        orderBy: { partner: { name: "asc" } },
      },
      clientPayments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amount: true,
          milestoneLabel: true,
          paidAt: true,
          receivedByPartnerId: true,
          receivedBy: { select: { id: true, name: true } },
        },
      },
      expenses: {
        orderBy: { expenseDate: "desc" },
        select: {
          id: true,
          amount: true,
          description: true,
          expenseDate: true,
          paidById: true,
          isReimbursed: true,
          deductFromCustody: true,
          paidBy: { select: { id: true, name: true } },
        },
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
      paidByPartnerId: e.paidById,
      isReimbursed: e.isReimbursed,
      deductFromCustody: e.deductFromCustody,
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

  const custody: ProjectCustodySummary = getProjectCustodyBreakdown(
    {
      id: project.id,
      contractValue: toNumber(project.contractValue),
      clientPayments: project.clientPayments.map((p) => ({
        amount: toNumber(p.amount),
        receivedByPartnerId: p.receivedByPartnerId,
      })),
      expenses: project.expenses.map((e) => ({
        amount: toNumber(e.amount),
        paidById: e.paidById,
        deductFromCustody: e.deductFromCustody,
      })),
    },
    project.projectPartners.map((s) => ({
      id: s.partnerId,
      name: s.partner.name,
    })),
  );

  return { project, financials, settlement, custody };
}

function toLedgerProject(p: {
  id: string;
  name: string;
  contractValue: unknown;
  projectPartners: { partnerId: string; sharePercentage: number }[];
  clientPayments: { amount: unknown }[];
  expenses: {
    amount: unknown;
    paidById?: string | null;
    paidByPartnerId?: string | null;
    isReimbursed: boolean;
    deductFromCustody?: boolean;
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
      paidByPartnerId: e.paidById || e.paidByPartnerId || null,
      isReimbursed: e.isReimbursed,
      deductFromCustody: e.deductFromCustody,
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
  // Independent reads run concurrently; selects stay minimal so the
  // pooled connection moves only the scalars the ledger engine needs
  // (no text blobs, timestamps, or nested partner joins).
  const [partners, projectsRaw, drawingsRaw, companyRaw, fixedCostsRaw] = await Promise.all([
    db.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultSharePercentage: true, isActive: true },
    }),
    db.project.findMany({
      where: window ? { createdAt: window } : undefined,
      select: {
        id: true,
        name: true,
        contractValue: true,
        status: true,
        projectPartners: {
          select: { partnerId: true, sharePercentage: true },
        },
        clientPayments: window
          ? { where: { paidAt: window }, select: { amount: true } }
          : { select: { amount: true } },
        expenses: window
          ? {
              where: { expenseDate: window },
              select: {
                id: true,
                description: true,
                amount: true,
                paidById: true,
                isReimbursed: true,
                deductFromCustody: true,
                expenseDate: true,
              },
            }
          : {
              select: {
                id: true,
                description: true,
                amount: true,
                paidById: true,
                isReimbursed: true,
                deductFromCustody: true,
                expenseDate: true,
              },
            },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.partnerDrawing.findMany({
      where: window ? { drawnAt: window } : undefined,
      select: { partnerId: true, amount: true },
    }),
    db.companyExpense.findMany({
      where: window ? { expenseDate: window } : undefined,
      select: {
        id: true,
        title: true,
        amount: true,
        kind: true,
        expenseDate: true,
        payments: { select: { partnerId: true, amount: true } },
        payouts: { select: { partnerId: true, amount: true, expenseId: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.companyFixedCost.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, amount: true },
    }),
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
        .filter((e) => e.paidById)
        .map((e) => ({
          id: e.id,
          title: e.description,
          amount: toNumber(e.amount),
          projectName: p.name,
          projectId: p.id,
          paidByName: (e.paidById && partnerNameById[e.paidById]) || "",
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
      select: {
        id: true,
        title: true,
        amount: true,
        kind: true,
        expenseDate: true,
        payments: {
          select: {
            id: true,
            partnerId: true,
            amount: true,
            partner: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: "desc" },
        },
        payouts: {
          select: {
            id: true,
            partnerId: true,
            amount: true,
            expenseId: true,
            partner: { select: { id: true, name: true } },
          },
          orderBy: { paidAt: "desc" },
        },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultSharePercentage: true, isActive: true },
    }),
    db.companyFixedCost.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, amount: true },
    }),
    db.companyPayout.findMany({
      select: {
        id: true,
        amount: true,
        paidAt: true,
        partner: { select: { id: true, name: true } },
        expense: { select: { id: true, title: true } },
      },
      orderBy: { paidAt: "desc" },
      take: 50,
    }),
  ]);
  return { expenses, partners, fixedCosts, payouts };
}

/** Treasury page data: every project with its frozen splits + custodied payments. */
export async function getTreasuryData() {
  const [partners, projects] = await Promise.all([
    db.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        projectPartners: {
          select: { partnerId: true, sharePercentage: true },
        },
        clientPayments: {
          orderBy: { paidAt: "desc" },
          select: { amount: true, receivedByPartnerId: true },
        },
      },
    }),
  ]);
  return { partners, projects };
}

/** Monthly summary data: everything the engine needs to settle one month. */
export async function getSummaryData() {
  const [company, projectCosts, partners] = await Promise.all([
    db.companyExpense.findMany({
      select: {
        id: true,
        title: true,
        amount: true,
        kind: true,
        expenseDate: true,
        payments: { select: { partnerId: true, amount: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.expense.findMany({
      select: {
        amount: true,
        description: true,
        expenseDate: true,
        paidById: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
    db.partner.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultSharePercentage: true, isActive: true },
    }),
  ]);
  return {
    company,
    projectCosts: projectCosts.map((c) => ({
      amount: c.amount,
      description: c.description,
      expenseDate: c.expenseDate,
      paidByPartnerId: c.paidById,
      project: c.project,
    })),
    partners,
  };
}

/** Partner ledger page data (ledgers + drawings detail). */
export async function getLedgerData() {
  // All three reads are independent — fan out concurrently instead of
  // awaiting the dashboard first and stalling the other two behind it.
  const [dashboard, drawings, expenses] = await Promise.all([
    getDashboardData(),
    db.partnerDrawing.findMany({
      select: {
        id: true,
        amount: true,
        notes: true,
        drawnAt: true,
        partner: { select: { id: true, name: true } },
      },
      orderBy: { drawnAt: "desc" },
      take: 100,
    }),
    db.expense.findMany({
      // Client-covered and custody-deducted rows owe nobody — never appear as pending.
      where: {
        isReimbursed: false,
        deductFromCustody: false,
        paidById: { not: null },
      },
      select: {
        id: true,
        amount: true,
        paidBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
    }),
  ]);
  const { partners, ledgers, overview } = dashboard;
  return { partners, ledgers, overview, drawings, pendingExpenses: expenses };
}
