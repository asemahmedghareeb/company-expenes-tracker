import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding demo firm…");

  // Clean (dev only)
  await db.partnerDrawing.deleteMany();
  await db.projectExpense.deleteMany();
  await db.clientPayment.deleteMany();
  await db.projectPartner.deleteMany();
  await db.project.deleteMany();
  await db.partner.deleteMany();

  // --- Partners: global defaults sum to 100 ---
  const [amina, bilal, chen] = await Promise.all([
    db.partner.create({
      data: {
        name: "Amina Khan",
        email: "amina@firm.com",
        defaultSharePercentage: 50,
        isActive: true,
      },
    }),
    db.partner.create({
      data: {
        name: "Bilal Ahmed",
        email: "bilal@firm.com",
        defaultSharePercentage: 30,
        isActive: true,
      },
    }),
    db.partner.create({
      data: {
        name: "Chen Wei",
        email: "chen@firm.com",
        defaultSharePercentage: 20,
        isActive: true,
      },
    }),
  ]);
  console.log("Partners:", amina.name, bilal.name, chen.name);

  // --- Project 1: uses default 50/30/20 snapshot ---
  const p1 = await db.project.create({
    data: {
      name: "Acme Website Redesign",
      description: "Corporate site + CMS for Acme Corp.",
      contractValue: 50000,
      status: "ACTIVE",
      projectPartners: {
        create: [
          { partnerId: amina.id, sharePercentage: 50 },
          { partnerId: bilal.id, sharePercentage: 30 },
          { partnerId: chen.id, sharePercentage: 20 },
        ],
      },
    },
  });

  await db.clientPayment.createMany({
    data: [
      {
        projectId: p1.id,
        amount: 15000,
        milestoneLabel: "Milestone 1 — Advance",
        paidAt: new Date("2026-06-01"),
      },
      {
        projectId: p1.id,
        amount: 10000,
        milestoneLabel: "Milestone 2 — Design sign-off",
        paidAt: new Date("2026-07-15"),
      },
    ],
  });

  // Bilal paid hosting out of pocket (pending), Chen paid travel (reimbursed)
  await db.projectExpense.createMany({
    data: [
      {
        projectId: p1.id,
        paidByPartnerId: bilal.id,
        amount: 2000,
        description: "Cloud hosting (annual)",
        expenseDate: new Date("2026-06-05"),
        isReimbursed: false,
      },
      {
        projectId: p1.id,
        paidByPartnerId: chen.id,
        amount: 1500,
        description: "Client onsite travel",
        expenseDate: new Date("2026-06-20"),
        isReimbursed: true,
        reimbursedAt: new Date("2026-07-01"),
      },
    ],
  });

  // --- Project 2: CUSTOM 50/50 split between two partners only ---
  // Proves per-project override + historic immutability.
  const p2 = await db.project.create({
    data: {
      name: "Beta Mobile App (MVP)",
      description: "MVP split 50/50 between Amina & Bilal only.",
      contractValue: 30000,
      status: "ACTIVE",
      projectPartners: {
        create: [
          { partnerId: amina.id, sharePercentage: 50 },
          { partnerId: bilal.id, sharePercentage: 50 },
        ],
      },
    },
  });

  await db.clientPayment.create({
    data: {
      projectId: p2.id,
      amount: 12000,
      milestoneLabel: "Sprint 1 delivery",
      paidAt: new Date("2026-08-01"),
    },
  });

  await db.projectExpense.create({
    data: {
      projectId: p2.id,
      paidByPartnerId: amina.id,
      amount: 3000,
      description: "App store + device lab",
      expenseDate: new Date("2026-08-05"),
      isReimbursed: false,
    },
  });

  // --- Drawings ---
  await db.partnerDrawing.createMany({
    data: [
      {
        partnerId: amina.id,
        amount: 4000,
        notes: "July draw",
        drawnAt: new Date("2026-07-31"),
      },
      {
        partnerId: bilal.id,
        amount: 1000,
        notes: "Advance",
        drawnAt: new Date("2026-08-10"),
      },
    ],
  });

  console.log("Done. Expected demo math:");
  console.log(
    "P1: inflow 25000, expenses 3500 → net 21500 → Amina 10750, Bilal 6450, Chen 4300",
  );
  console.log(
    "P2: inflow 12000, expenses 3000 → net 9000 → Amina 4500, Bilal 4500",
  );
  console.log("Pending: Bilal 2000, Amina 3000. Drawings: Amina 4000, Bilal 1000.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
