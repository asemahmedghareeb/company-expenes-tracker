import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatEGP } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { getCompanyExpenseSettlement, toNumber } from "@/lib/ledger";
import { sharesSumTo100 } from "@/lib/shares";
import { getCompanyData } from "@/actions/queries";
import {
  CompanyExpenseForm,
  CompanyPayoutForm,
  DeleteCompanyPayoutButton,
  FixedCostsManager,
} from "@/components/forms/company-forms";
import { CompanyExpensesList } from "@/components/company-expenses-list";
import { PageGuide } from "@/components/ui/page-guide";

// Cached by default — mutations revalidate on demand via revalidatePath().

export default async function CompanyPage() {
  const lang = await getLang();
  const t = dict[lang].company;
  const { expenses, partners, fixedCosts, payouts } =
    await getCompanyData().catch(() => ({
      expenses: [],
      partners: [],
      fixedCosts: [],
      payouts: [],
    }));

  const active = partners.filter((p) => p.isActive);
  const defaultsOk =
    active.length === 0 ||
    sharesSumTo100(active.map((p) => p.defaultSharePercentage));

  const companyPartners = partners.map((p) => ({
    id: p.id,
    name: p.name,
    defaultSharePercentage: p.defaultSharePercentage,
    isActive: p.isActive,
  }));

  const expenseItems = expenses.map((e) => {
    const s = getCompanyExpenseSettlement(
      {
        id: e.id,
        title: e.title,
        amount: toNumber(e.amount),
        payments: e.payments.map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
        })),
        payouts: e.payouts.map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
          expenseId: x.expenseId ?? undefined,
        })),
      },
      companyPartners,
    );

    return {
      expense: {
        id: e.id,
        title: e.title,
        amount: toNumber(e.amount),
        notes: e.notes,
        kind: e.kind,
        expenseDate: e.expenseDate.toISOString(),
        billingMonth: e.billingMonth,
        vaultAmount: toNumber(e.vaultAmount),
        vaultDisbursed: e.vaultDisbursed,
        vaultDisbursedAt: e.vaultDisbursedAt ? e.vaultDisbursedAt.toISOString() : null,
        vaultNotes: e.vaultNotes,
        payments: e.payments.map((p) => ({
          id: p.id,
          partnerId: p.partnerId,
          amount: toNumber(p.amount),
          partner: { id: p.partner.id, name: p.partner.name },
        })),
      },
      settlement: s,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {!defaultsOk && active.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="pt-6 text-sm text-amber-800 dark:text-amber-200">
            {t.warnDefaults}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        <div className="space-y-6 lg:col-span-1 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.addTitle}</CardTitle>
              <CardDescription>{t.addDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyExpenseForm
                lang={lang}
                partners={partners}
                fixedCosts={fixedCosts.map((f) => ({
                  id: f.id,
                  title: f.title,
                  amount: toNumber(f.amount),
                }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.fixedTitle}</CardTitle>
              <CardDescription>{t.fixedDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <FixedCostsManager
                lang={lang}
                fixedCosts={fixedCosts.map((f) => ({
                  id: f.id,
                  title: f.title,
                  amount: toNumber(f.amount),
                }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.payoutTitle}</CardTitle>
              <CardDescription>{t.payoutDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyPayoutForm
                lang={lang}
                partners={partners.map((p) => ({ id: p.id, name: p.name }))}
                expenses={expenses.map((e) => ({ id: e.id, title: e.title }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.payoutHistory}</CardTitle>
              <CardDescription>{t.payoutHistoryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {payouts.map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {x.partner.name} · {formatEGP(Number(x.amount), lang)}
                    {x.expense && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {t.payoutTo} {x.expense.title}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDate(x.paidAt, lang)}
                    </span>
                  </span>
                  <DeleteCompanyPayoutButton id={x.id} lang={lang} />
                </div>
              ))}
              {payouts.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noPayouts}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <CompanyExpensesList
            items={expenseItems}
            partners={partners.map((p) => ({ id: p.id, name: p.name }))}
            lang={lang}
          />
        </div>
      </div>

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل مصاريف الشركة وتسوية مساهمات الشركاء" : "Company Expenses & Partner Settlements Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لشرح تسجيل المدفوعات، ورد المبالغ للشركاء، والمعادلات المطبقة"
            : "Official accounting guide explaining partner payments, payouts, and cost distributions"
        }
        steps={[
          {
            title: lang === "ar" ? "مصاريف الشركة العامة" : "Company General Expenses",
            text:
              lang === "ar"
                ? "تشمل التكاليف التشغيلية الثابتة (كالإيجار وفواتير النت) أو المتغيرة لمقر الشركة. تُقسم قيمة كل مصروف على الشركاء بنسب حصصهم الافتراضية."
                : "Operational overhead (rent, internet, maintenance) distributed to partners according to default shares.",
          },
          {
            title: lang === "ar" ? "تسجيل دفعة الشريك (تسجيل المدفوعات)" : "Partner Payment (تسجيل دفعة الشريك)",
            text:
              lang === "ar"
                ? "يُستخدم عندما يقوم شريك بسداد نصيبه المستحق من مصروف الشركة المشترك (مثل سداد حصته في إيجار المقر)، مما يقلل رصيده المدين ويقربه من التسوية."
                : "Used when a partner pays their owed share of a shared company cost, decreasing their outstanding liability.",
            badge: { text: lang === "ar" ? "سداد حصة" : "Share Payment", variant: "secondary" },
          },
          {
            title: lang === "ar" ? "رد مبلغ لشريك (Company Payout)" : "Partner Payout / Reimbursement (رد مبلغ لشريك)",
            text:
              lang === "ar"
                ? "يُستخدم عندما تدفع الشركة كاش من خزينتها لشريك قام مسبقاً بدفع مصروف كامل للشركة من جيبه الخاص، بهدف رد أمواله وتصفية رصيده الدائن."
                : "Used when company pays back cash to a partner who originally paid an entire company expense out-of-pocket.",
            badge: { text: lang === "ar" ? "رد كاش للشريك" : "Cash Reimbursement", variant: "outline" },
          },
          {
            title: lang === "ar" ? "التسوية والإغلاق" : "Settlement",
            text:
              lang === "ar"
                ? "عندما يكتمل سداد حصص جميع الشركاء ورد ما دفع بالزيادة، يصبح البند «مسدد بالكامل» ويُقفل دفترياً."
                : "Once all shares are collected and reimbursements made, the cost item is fully settled.",
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "معادلة نصيب الشريك في مصروف الشركة" : "Partner Share in Expense",
            formula:
              lang === "ar"
                ? "نصيب الشريك = قيمة المصروف الإجمالية × نسبة حصته الافتراضية %"
                : "Partner Share = Total Expense Amount × Partner Share %",
          },
          {
            label: lang === "ar" ? "معادلة المبلغ المتبقي على الشريك سداده" : "Partner Remaining Liability",
            formula:
              lang === "ar"
                ? "المتبقي على الشريك = نصيب الشريك − إجمالي ما سدده الشريك لهذا البند"
                : "Remaining = Partner Share − Total Partner Payments Recorded",
            explanation:
              lang === "ar"
                ? "إذا دفع الشريك أكثر من نصيبه (مثلاً سدد الفاتورة كاملة من جيبه)، يظهر له رصيد دائن يستحق «رد مبلغ لشريك»."
                : "If a partner paid the full bill, they are owed a refund via the Payout form.",
          },
        ]}
        tips={[
          lang === "ar"
            ? "«رد مبلغ لشريك»: لا تستخدم هذا النموذج إلا إذا تم رد كاش حقيقي للشريك مقابل فاتورة دفعها من جيبه."
            : "Use Partner Payout only when cash was reimbursed to a partner who paid out of pocket.",
        ]}
      />
    </div>
  );
}
