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
import { PageGuide } from "@/components/ui/page-guide";

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
      projectName: e.project?.name ?? "—",
      title: e.description,
      deductFromCustody: e.deductFromCustody,
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

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل الملخص المالي والتسوية الشهرية" : "Monthly Financial Summary Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لتسوية التكاليف وتحديد من يدين لمن في نهاية كل شهر"
            : "Official monthly settlement guide showing who paid, who owes, and net balances"
        }
        steps={[
          {
            title: lang === "ar" ? "ما دفعه الشريك (Paid)" : "Paid by Partner",
            text:
              lang === "ar"
                ? "إجمالي المبالغ التي سددها الشريك من حسابه الخاص خلال الشهر المحدد (سواء لمصاريف الشركة العامة كالإيجار أو لمصاريف المشاريع)."
                : "Total out-of-pocket payments made by the partner during the selected month.",
            badge: { text: lang === "ar" ? "مدفوعات الشريك" : "Payments", variant: "secondary" },
          },
          {
            title: lang === "ar" ? "نصيب الشريك المفروض (Share)" : "Assigned Share",
            text:
              lang === "ar"
                ? "حصة الشريك المحسوبة من إجمالي تكاليف الشركة والمشاريع التراكمية بناءً على نسبة حصته الافتراضية."
                : "Partner's contractual share of total shared expenditures based on default percentage.",
          },
          {
            title: lang === "ar" ? "صافي الرصيد والتسوية (Balance)" : "Net Balance",
            text:
              lang === "ar"
                ? "إذا دفع الشريك أكثر من حصته، يكون له رصيد دائن بالأخضر ويستحق استرداده. وإذا دفع أقل، يكون عليه رصيد مدين بالأحمر ويجب عليه سداده."
                : "Partners who overpaid are owed money (green); partners who underpaid owe the difference (red).",
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "معادلة صافي المركز المالي للشريك" : "Partner Financial Position Equation",
            formula:
              lang === "ar"
                ? "الرصيد الصافي = إجمالي ما دفعه الشريك − حصته المستحقة في تكاليف الشهر"
                : "Net Balance = Total Paid by Partner − Entitled Cost Share",
            explanation:
              lang === "ar"
                ? "رصيد موجب (+) = الشريك دائن (له مستحقات) | رصيد سالب (−) = الشريك مدين (عليه مستحقات سداد)."
                : "Positive (+) = Owed to Partner | Negative (−) = Partner Owes.",
          },
        ]}
      />
    </div>
  );
}
