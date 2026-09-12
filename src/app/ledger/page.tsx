import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEGP, formatPct } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { getLedgerData, getPartners } from "@/actions/queries";
import { PaginatedPendingExpensesTable } from "@/components/ledger-tables";
import { PageGuide } from "@/components/ui/page-guide";

// Cached by default — mutations revalidate on demand via revalidatePath().

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "ar" ? "حسابات الشركاء | TADX Finance" : "Partner Accounts | TADX Finance",
  };
}

export default async function LedgerPage() {
  const lang = await getLang();
  const t = dict[lang].ledger;

  const [data, partners] = await Promise.all([
    getLedgerData().catch(() => null),
    getPartners().catch(() => []),
  ]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.unavailable}</CardTitle>
          <CardDescription>{t.unavailableDesc}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { ledgers, drawings, pendingExpenses } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ledgers.map((l) => (
          <Card key={l.partnerId}>
            <CardHeader className="pb-2">
              <CardDescription>{l.partnerName}</CardDescription>
              <CardTitle
                className={`text-2xl ${l.balance < 0 ? "text-red-600" : "text-emerald-700"}`}
              >
                {formatEGP(l.balance, lang)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.pendingShort}</span>
                <span>{formatEGP(l.pendingReimbursements, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.profitShare}</span>
                <span>{formatEGP(l.realizedProfitShare, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.companyNet}</span>
                <span>{formatEGP(l.companyNet, lang)}</span>
              </div>
              {(l.breakdown.length > 0 || l.companyBreakdown.length > 0) && (
                <div className="pt-2">
                  {l.breakdown.map((b) => (
                    <div
                      key={b.projectId}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>
                        {b.projectName ?? b.projectId.slice(0, 8)} ({formatPct(b.sharePercentage)})
                      </span>
                      <span>{formatEGP(b.totalOwed, lang)}</span>
                    </div>
                  ))}
                  {l.companyBreakdown.map((c) => (
                    <div
                      key={c.expenseId}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>{c.title ?? c.expenseId.slice(0, 8)}</span>
                      <span>{formatEGP(c.net, lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {ledgers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.noPartners}</p>
        )}
      </div>

      {/* Pending reimbursements waiting for settlement */}
      <Card>
        <CardHeader>
          <CardTitle>{t.pendingTitle}</CardTitle>
          <CardDescription>{t.pendingDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <PaginatedPendingExpensesTable
            lang={lang}
            expenses={pendingExpenses.map((e) => ({
              id: e.id,
              amount: Number(e.amount),
              project: e.project ? { name: e.project.name } : null,
              paidBy: e.paidBy ? { name: e.paidBy.name } : null,
            }))}
          />
        </CardContent>
      </Card>

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل حسابات الشركاء وتوزيع الأرباح" : "Partner Accounts & Profit Settlements Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لتفسير رصيد كل شريك والمعادلات المطبقة بدقة (دون تخزين أموال بالشركة)"
            : "Official accounting guide explaining partner balances and direct per-project profit settlements"
        }
        steps={[
          {
            title: lang === "ar" ? "تسوية الأرباح فورية لكل مشروع" : "Direct Project Profit Settlements",
            text:
              lang === "ar"
                ? "الشركة لا تحتفظ بأموال أو أرباح الشركاء كودائع؛ بمجرد تسوية أي مشروع بعد استلام دفعات العميل وسداد مصاريفه، يستلم كل شريك نصيبه من الأرباح فوراً."
                : "The company does not hold partner funds as deposits. Upon settling each project, partners receive their profit shares directly.",
            badge: { text: lang === "ar" ? "تسوية نقدية فورية" : "Direct Cash Payout", variant: "default" },
          },
          {
            title: lang === "ar" ? "المستحقات المعلقة (دفعات مدفوعة من الجيب)" : "Pending Out-of-Pocket Reimbursements",
            text:
              lang === "ar"
                ? "أي نفقات أو فواتير يدفعها الشريك من ماله الخاص لصالح مشروع معين أو لتغطية مصاريف الشركة. تُسجل كدين مؤكد على الشركة للشريك وتظهر برصيد إيجابي (+) حتى يتم ردها له."
                : "Expenses paid by a partner out-of-pocket for projects or company bills. Tracked as an owed debt to be reimbursed upon settlement.",
            badge: { text: lang === "ar" ? "مستحق للشريك (+)" : "Owed to Partner (+)", variant: "outline" },
          },
          {
            title: lang === "ar" ? "حصص الأرباح المحققة" : "Realized Profit Shares",
            text:
              lang === "ar"
                ? "إجمالي حصص الأرباح التعاقدية للشريك الناتجة عن المشاريع المنجزة، بعد خصم كافة تكاليف المشروع من المبالغ المحصلة من العميل."
                : "Partner's contractual share of net project profits after deducting project direct costs from received client cash.",
            badge: { text: lang === "ar" ? "أرباح محققة (+)" : "Realized Profit (+)", variant: "success" },
          },
          {
            title: lang === "ar" ? "صافي مصاريف الشركة العامة" : "Company Operational Overhead",
            text:
              lang === "ar"
                ? "توزيع فواتير المقر والاشتراكات الشهرية (إيجار، كهرباء، إنترنت) بنسب التأسيس الافتراضية؛ من دفع أكثر من حصته يُسجل له رصيد دائن (+)، ومن دفع أقل يسجل عليه رصيد مدين (−)."
                : "Distribution of office overhead (rent, utilities) according to equity shares. Paying more yields a credit (+), paying less yields a debit (−).",
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "المعادلة المحاسبية المعتمدة لرصيد الشريك" : "Official Partner Balance Equation",
            formula:
              lang === "ar"
                ? "الرصيد النهائي = المستحقات المعلقة (مدفوعة من الجيب) + حصص الأرباح المحققة + صافي مصاريف الشركة"
                : "Balance = Pending Reimbursements + Realized Profit Shares + Company Net",
            explanation:
              lang === "ar"
                ? "الرصيد يمثل صافي المركز المالي للشريك: الرصيد الأخضر (+) يعني مستحقات واجبة السداد للشريك، والرصيد الأحمر (−) يعني مبالغ مستحقة عليه لتغطية التكاليف التشغيلية، و0.00 ج.م يعني تسوية وتطابق الحسابات بالكامل."
                : "Positive balance (green) indicates net dues owed to the partner; negative balance (red) represents operating expenses owed by the partner.",
          },
        ]}
        tips={[
          lang === "ar"
            ? "تسوية المشاريع: تتم من خلال صفحة «رأس مال الشركة والخزنة» أو صفحة كل مشروع، حيث تُقتسم الأرباح ويستلمها الشركاء مباشرة."
            : "Project settlements: Executed in the Treasury or project details page, with direct payouts to partners.",
          lang === "ar"
            ? "استرداد النفقات: تسجل نفقات الجيب تلقائياً في جدول «المستحقات المعلقة» أعلاه حتى تتم جدولتها وصرفها للشريك."
            : "Expense reimbursements: Logged automatically in the Pending Reimbursements table until reimbursed.",
          lang === "ar"
            ? "مصاريف الشركة: تابع الفواتير الدورية ونسب مساهمة كل شريك من خلال تبويب «مصاريف الشركة»."
            : "Company overhead: Track recurring bills and partner contributions in the Company Expenses tab.",
        ]}
      />
    </div>
  );
}
