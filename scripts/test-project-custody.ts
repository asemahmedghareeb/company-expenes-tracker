import {
  getProjectCustodyBreakdown,
  getProjectFinancials,
  getProjectSettlementPlan,
} from "../src/lib/ledger";
import { expenseSchema, projectExpenseSchema } from "../src/lib/validations";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${msg}`);
}

console.log("=== RUNNING PROJECT CUSTODY ENGINE TESTS ===\n");

// 1. Test Project Custody Breakdown Calculation
const mockProject = {
  id: "proj-1",
  name: "Website Redesign",
  contractValue: 100000,
  clientPayments: [
    { amount: 30000, receivedByPartnerId: "partner-asem" },
    { amount: 20000, receivedByPartnerId: "partner-tarek" },
  ],
  expenses: [
    // Asem pays 5000 from custody
    { amount: 5000, paidById: "partner-asem", deductFromCustody: true },
    // Tarek pays 8000 from custody
    { amount: 8000, paidById: "partner-tarek", deductFromCustody: true },
    // Asem pays 2000 out of pocket
    { amount: 2000, paidById: "partner-asem", deductFromCustody: false },
    // David pays 3000 out of pocket
    { amount: 3000, paidById: "partner-david", deductFromCustody: false },
  ],
};

const mockPartners = [
  { id: "partner-asem", name: "Asem" },
  { id: "partner-tarek", name: "Tarek" },
  { id: "partner-david", name: "David" },
];

const breakdown = getProjectCustodyBreakdown(mockProject, mockPartners);

assert(breakdown.contractValue === 100000, "Contract value is 100,000");
assert(breakdown.totalPaidSoFar === 50000, "Total paid so far is 50,000");
assert(breakdown.remainingUncollected === 50000, "Remaining uncollected is 50,000 (100,000 - 50,000)");

const asemCustody = breakdown.partners.find((p) => p.partnerId === "partner-asem")!;
assert(asemCustody.inflow === 30000, "Asem project inflow = 30,000");
assert(asemCustody.outflow === 5000, "Asem project custody outflow = 5,000");
assert(asemCustody.netCustody === 25000, "Asem net project custody = 25,000 (30,000 - 5,000)");
assert(asemCustody.isCashHolder === true, "Asem is identified as a cash holder");

const tarekCustody = breakdown.partners.find((p) => p.partnerId === "partner-tarek")!;
assert(tarekCustody.inflow === 20000, "Tarek project inflow = 20,000");
assert(tarekCustody.outflow === 8000, "Tarek project custody outflow = 8,000");
assert(tarekCustody.netCustody === 12000, "Tarek net project custody = 12,000 (20,000 - 8,000)");
assert(tarekCustody.isCashHolder === true, "Tarek is identified as a cash holder");

const davidCustody = breakdown.partners.find((p) => p.partnerId === "partner-david")!;
assert(davidCustody.inflow === 0, "David project inflow = 0");
assert(davidCustody.outflow === 0, "David project custody outflow = 0 (paid out of pocket)");
assert(davidCustody.netCustody === 0, "David net project custody = 0");
assert(davidCustody.isCashHolder === false, "David is not holding project cash");

assert(breakdown.totalCustodyHeld === 37000, "Total custody cash held = 37,000 (25,000 + 12,000)");
assert(breakdown.cashHolders[0]!.partnerId === "partner-asem", "Primary cash holder is Asem (25,000)");

// 2. Test Ledger Financials with Custody Deductions
const ledgerProject = {
  id: "proj-1",
  contractValue: 100000,
  projectPartners: [
    { partnerId: "partner-asem", sharePercentage: 50 },
    { partnerId: "partner-tarek", sharePercentage: 50 },
  ],
  clientPayments: [{ amount: 50000 }],
  expenses: [
    // 13,000 from custody (already reimbursed/settled from custody)
    { amount: 13000, paidByPartnerId: "partner-asem", isReimbursed: true, deductFromCustody: true },
    // 5,000 out of pocket (pending reimbursement)
    { amount: 5000, paidByPartnerId: "partner-david", isReimbursed: false, deductFromCustody: false },
  ],
};

const financials = getProjectFinancials(ledgerProject, 100000);
assert(financials.totalInflow === 50000, "Financials total inflow = 50,000");
assert(financials.totalExpenses === 18000, "Total operational expenses = 18,000");
assert(financials.netProfit === 32000, "Net profit = 32,000 (50,000 - 18,000)");
assert(financials.outstandingReimbursements === 5000, "Outstanding reimbursements = 5,000 (only out-of-pocket)");

const settlement = getProjectSettlementPlan(ledgerProject, 100000);
assert(settlement.reimbursementsDue.length === 1, "Only 1 partner owed out-of-pocket reimbursement");
assert(settlement.reimbursementsDue[0]!.partnerId === "partner-david", "David is owed out-of-pocket reimbursement");
assert(settlement.reimbursementsDue[0]!.amount === 5000, "David is owed 5,000");

// 3. Test Validation Schemas
const validProjectExpense = projectExpenseSchema.safeParse({
  projectId: "proj-1",
  paidById: "partner-asem",
  amount: 4500,
  description: "Cloud Hosting",
  deductFromCustody: true,
});
assert(validProjectExpense.success === true, "projectExpenseSchema validates custody expense");

const validGeneralExpense = expenseSchema.safeParse({
  projectId: null,
  paidById: "partner-asem",
  amount: 2000,
  description: "General Office Supplies",
});
assert(validGeneralExpense.success === true, "expenseSchema validates firm general expense (null projectId)");

console.log("\n🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!");
