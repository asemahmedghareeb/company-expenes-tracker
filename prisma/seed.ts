import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding firm…");

  // Clean (dev only) — order respects FK constraints
  await db.companyPayout.deleteMany();
  await db.companyExpensePayment.deleteMany();
  await db.companyExpense.deleteMany();
  await db.companyFixedCost.deleteMany();
  await db.partnerDrawing.deleteMany();
  await db.expense.deleteMany();
  await db.clientPayment.deleteMany();
  await db.projectPartner.deleteMany();
  await db.project.deleteMany();
  await db.partner.deleteMany();

  // --- Partners: 3 equal owners, each exactly 100/3 (displays as 33.33) ---
  const share = 100 / 3;
  const [asem, tarek, david] = await Promise.all(
    ["Asem", "Tarek", "David"].map((name) =>
      db.partner.create({
        data: { name, defaultSharePercentage: share, isActive: true },
      }),
    ),
  );
  console.log("Partners:", asem.name, tarek.name, david.name);

  console.log("Done. Clean start: Asem, Tarek, David — 1/3 each, no projects/expenses.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
