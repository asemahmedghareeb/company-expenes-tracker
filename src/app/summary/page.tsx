import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dict, getLang } from "@/lib/i18n";
import { getMonthlySummary, toNumber } from "@/lib/ledger";
import { getSummaryData } from "@/actions/queries";
import { MonthPicker } from "./month-picker";
import { SummaryRows } from "./summary-rows";

// Cached by default — mutations revalidate on demand via revalidatePath().
// Uses searchParams (month), so Next renders dynamically per request.

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const lang = await getLang();
  const t = dict[lang].summary;
  const { month: raw } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(raw ?? "") ? raw! : currentMonth();

  const { company, projectCosts, partners } = await getSummaryData().catch(
    () => ({ company: [], projectCosts: [], partners: [] }),
  );

  const summary = getMonthlySummary(month, {
    company: company.map((e) => ({
      id: e.id,
      title: e.title,
      amount: toNumber(e.amount),
      kind: (e.kind === "FIXED" ? "fixed" : "variable") as "fixed" | "variable",
      expenseDate:
        e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate),
      payments: e.payments.map((x) => ({
        partnerId: x.partnerId,
        amount: toNumber(x.amount),
      })),
    })),
    projectCosts: projectCosts.map((e) => ({
      amount: toNumber(e.amount),
      paidByPartnerId: e.paidByPartnerId,
      expenseDate:
        e.expenseDate instanceof Date ? e.expenseDate.toISOString() : String(e.expenseDate),
      projectName: e.project.name,
      title: e.description,
    })),
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      defaultSharePercentage: p.defaultSharePercentage,
      isActive: p.isActive,
    })),
    partnerNames: Object.fromEntries(partners.map((p) => [p.id, p.name])),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <MonthPicker month={month} label={t.chooseMonth} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.colBalance}</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryRows lang={lang} rows={summary.rows} />
        </CardContent>
      </Card>
    </div>
  );
}
