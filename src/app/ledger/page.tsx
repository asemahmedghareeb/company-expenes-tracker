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
import { DeleteDrawingButton } from "@/components/forms/transaction-forms";
import {
  PaginatedPendingExpensesTable,
  PaginatedDrawingsTable,
} from "@/components/ledger-tables";
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
              {l.totalDrawings > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.drawings}</span>
                  <span>−{formatEGP(l.totalDrawings, lang)}</span>
                </div>
              )}
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

      {/* Historical drawings table — only shown if records exist */}
      {drawings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.recentTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <PaginatedDrawingsTable
              lang={lang}
              drawings={drawings.map((d) => ({
                id: d.id,
                amount: Number(d.amount),
                drawnAt: d.drawnAt instanceof Date ? d.drawnAt.toISOString() : String(d.drawnAt),
                notes: d.notes,
                partner: { name: d.partner.name },
              }))}
            />
          </CardContent>
        </Card>
      )}

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل حسابات الشركاء وتوزيع الأرباح" : "Partner Accounts & Profit Settlements Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي لتفسير رصيد كل شريك والمعادلات المطبقة بدقة بعد تسوية المشاريع"
            : "Official accounting reference explaining partner balances and exact equations"
        }
        steps={[
          {
            title: lang === "ar" ? "المستحقات المعلقة (دفعات من الجيب)" : "Pending Reimbursements",
            text:
              lang === "ar"
                ? "أي مصروف دفعه الشريك من ماله الخاص لصالح مشروع أو مصاريف الشركة دون أن يتم رده له بعد، فيُحسب كدين على الشركة للشريك."
                : "Expenses paid by the partner out-of-pocket for projects or company costs not yet reimbursed.",
            badge: { text: lang === "ar" ? "مستحق للشريك (+)" : "Owed to Partner (+)", variant: "outline" },
          },
          {
            title: lang === "ar" ? "حصص الأرباح المحققة" : "Realized Profit Shares",
            text:
              lang === "ar"
                ? "نصيب الشريك المتفق عليه من صافي أرباح المشاريع بعد سداد تكاليفها وتحصيل دفعات العميل وتسويتها."
                : "Partner's contractual share of net project profits after deducting project expenses from received client cash.",
            badge: { text: lang === "ar" ? "أرباح مضافة (+)" : "Added Profit (+)", variant: "success" },
          },
          {
            title: lang === "ar" ? "صافي الشركة" : "Company Net",
            text:
              lang === "ar"
                ? "نصيب الشريك في صافي تكاليف الشركة العامة المشتركة (كالإيجار والاشتراكات) بعد خصم ما دفعه."
                : "Partner's share of company general overhead after accounting for their contributions.",
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "المعادلة المحاسبية المعتمدة لرصيد الشريك" : "Official Partner Balance Equation",
            formula:
              lang === "ar"
                ? "الرصيد النهائي = المستحقات المعلقة + حصص الأرباح المحققة + صافي الشركة"
                : "Balance = Pending Reimbursements + Realized Profit Shares + Company Net",
            explanation:
              lang === "ar"
                ? "الرصيد يمثل صافي المستحقات الحالية للشريك، وتتم تسوية الأرباح وتوزيعها فور الانتهاء من تسوية كل مشروع."
                : "Balance represents partner dues; settled and distributed upon each project settlement.",
          },
        ]}
        tips={[
          lang === "ar"
            ? "تسوية أرباح المشاريع: يستلم كل شريك مستحقاته فور إتمام تسوية المشروع واقتسام الأرباح."
            : "Project settlements: Partners take their profit shares directly upon settlement of each project.",
          lang === "ar"
            ? "يتم تسجيل دفعات العملاء ومصاريف المشاريع مباشرة في صفحات المشاريع الخاصة بها."
            : "Client payments and project direct expenses are managed in project pages.",
        ]}
      />
    </div>
  );
}
