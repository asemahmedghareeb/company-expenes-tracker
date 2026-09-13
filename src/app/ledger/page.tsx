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
import { ArrowLeftRight, Lightbulb } from "lucide-react";
import { dict, getLang } from "@/lib/i18n";
import { getLedgerData, getPartners } from "@/actions/queries";
import { computeInterPartnerDebts, round2 } from "@/lib/ledger";
import {
  PaginatedPendingExpensesTable,
  PartnerProjectsBreakdownDialog,
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

  const { ledgers, drawings, pendingExpenses, p2pPayouts } = data;

  // Compute inter-partner debts from P2P payouts
  const partnerNamesMap: Record<string, string> = {};
  for (const l of ledgers) partnerNamesMap[l.partnerId] = l.partnerName;
  const interPartnerDebts = computeInterPartnerDebts(
    p2pPayouts.map((p) => ({
      partnerId: p.partnerId,
      paidByPartnerId: p.paidByPartnerId,
      amount: Number(p.amount),
    })),
    partnerNamesMap,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {/* Partner balance cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ledgers.map((l) => {
          const totalReceived = l.totalDrawings;
          // Cumulative entitlement = What was received via settlements + remaining balance owed to him (if positive)
          const totalEntitled = round2(totalReceived + Math.max(0, l.balance));
          let receivedPct = 0;
          let remainingPct = 0;
          if (totalEntitled > 0) {
            receivedPct = Math.min(100, Math.max(0, Math.round((totalReceived / totalEntitled) * 100)));
            remainingPct = 100 - receivedPct;
          } else if (l.balance <= 0 && totalReceived > 0) {
            receivedPct = 100;
            remainingPct = 0;
          }

          return (
            <Card key={l.partnerId} className="min-w-0 overflow-hidden shadow-xs hover:shadow-sm transition-all border-border/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="font-semibold text-foreground text-sm">{l.partnerName}</CardDescription>
                  {totalEntitled > 0 && (
                    <Badge
                      variant={receivedPct === 100 ? "success" : receivedPct > 0 ? "secondary" : "outline"}
                      className="text-[11px] font-mono font-medium px-2 py-0.5"
                    >
                      {receivedPct === 100
                        ? (lang === "ar" ? "مستلم 100% ✓" : "100% Settled ✓")
                        : (lang === "ar" ? `تم استلام ${receivedPct}%` : `Received ${receivedPct}%`)}
                    </Badge>
                  )}
                </div>
                <CardTitle
                  className={`text-2xl font-bold font-mono tracking-tight ${l.balance < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
                >
                  {formatEGP(l.balance, lang)}
                </CardTitle>

                {/* Settlement payout progress indicator */}
                <div className="pt-2 pb-0.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      {lang === "ar" ? `تم استلام: ${receivedPct}%` : `Received: ${receivedPct}%`}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {totalEntitled > 0
                        ? (lang === "ar" ? `متبقي: ${remainingPct}%` : `${remainingPct}% remaining`)
                        : (lang === "ar" ? "لا توجد أرباح بعد" : "No dues yet")}
                    </span>
                  </div>

                  {/* Visual progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/70 dark:bg-muted/30 border border-border/40">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                      style={{ width: `${receivedPct}%` }}
                    />
                  </div>

                  {/* Summary: Received vs Total Entitled */}
                  {totalEntitled > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 font-mono">
                      <span>{lang === "ar" ? "المستلم بالتسويات:" : "Settled:"} {formatEGP(totalReceived, lang)}</span>
                      <span>{lang === "ar" ? "الإجمالي:" : "Total:"} {formatEGP(totalEntitled, lang)}</span>
                    </div>
                  )}
                </div>
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
              {/* P2P debt indicators on this partner's card */}
              {interPartnerDebts.filter(
                (d) => d.debtorId === l.partnerId || d.creditorId === l.partnerId,
              ).length > 0 && (
                <div className="pt-1 border-t border-border/50 space-y-1">
                  {interPartnerDebts
                    .filter((d) => d.debtorId === l.partnerId)
                    .map((d) => (
                      <div key={`${d.debtorId}-${d.creditorId}`} className="flex justify-between text-xs text-red-600 dark:text-red-400">
                        <span>← {lang === "ar" ? `مدين لـ ${d.creditorName}` : `Owes ${d.creditorName}`}</span>
                        <span className="font-mono">{formatEGP(d.amount, lang)}</span>
                      </div>
                    ))}
                  {interPartnerDebts
                    .filter((d) => d.creditorId === l.partnerId)
                    .map((d) => (
                      <div key={`${d.debtorId}-${d.creditorId}`} className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
                        <span>→ {lang === "ar" ? `يستحق من ${d.debtorName}` : `Owed by ${d.debtorName}`}</span>
                        <span className="font-mono">{formatEGP(d.amount, lang)}</span>
                      </div>
                    ))}
                </div>
              )}
              {/* View Projects Breakdown Dialog Button */}
              <div className="pt-2 border-t border-border/50">
                <PartnerProjectsBreakdownDialog
                  partnerName={l.partnerName}
                  balance={l.balance}
                  pendingReimbursements={l.pendingReimbursements}
                  realizedProfitShare={l.realizedProfitShare}
                  companyNet={l.companyNet}
                  totalDrawings={l.totalDrawings}
                  breakdown={l.breakdown}
                  companyBreakdown={l.companyBreakdown}
                  lang={lang}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
        {ledgers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.noPartners}</p>
        )}
      </div>

      {/* Inter-partner debts from P2P payouts */}
      {interPartnerDebts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground" aria-hidden /> {lang === "ar" ? "مديونيات بين الشركاء" : "Inter-Partner Debts"}
            </CardTitle>
            <CardDescription>
              {lang === "ar"
                ? "مبالغ يدين بها شريك لآخر ناتجة عن عمليات رد المبلغ المباشر (من شريك لشريك). يُصفَّى الدين عند قيام المدين بسداد الدائن مباشرةً أو عبر تسجيل رد عكسي."
                : "Amounts owed between partners from direct P2P reimbursements. Settled when the debtor repays the creditor directly."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">
                      {lang === "ar" ? "المدين (يجب أن يدفع)" : "Debtor (must pay)"}
                    </TableHead>
                    <TableHead className="text-center">→</TableHead>
                    <TableHead className="text-right">
                      {lang === "ar" ? "الدائن (يستحق الاستلام)" : "Creditor (to receive)"}
                    </TableHead>
                    <TableHead className="text-left font-mono">
                      {lang === "ar" ? "المبلغ المستحق" : "Amount Owed"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interPartnerDebts.map((d) => (
                    <TableRow key={`${d.debtorId}-${d.creditorId}`}>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span className="font-medium">{d.debtorName}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-lg">→</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-medium">{d.creditorName}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <Badge variant="destructive" className="font-mono text-sm px-3 py-1">
                          {formatEGP(d.amount, lang)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 mt-px shrink-0" aria-hidden />
              <span>
              {lang === "ar"
                ? "لتسجيل سداد دين بين شريكين: اذهب لصفحة «مصاريف الشركة» واستخدم نموذج «رد مبلغ لشريك» — اختر الشريك الدائن كمستفيد والشريك المدين كمصدر الدفع بالمبلغ نفسه. سيُعيد هذا الحساب إلى الصفر تلقائياً."
                : "To settle a debt: go to Company Expenses, use 'Partner Payout', choose the creditor as recipient and the debtor as paying partner. The debt will clear automatically."}
              </span>
            </p>
          </CardContent>
        </Card>
      )}

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
            title: lang === "ar" ? "مديونيات بين الشركاء (رد مبلغ من شريك لآخر)" : "Inter-Partner Debts (P2P)",
            text:
              lang === "ar"
                ? "عند قيام شريك بدفع مستحقات شريك آخر مباشرةً من ماله الخاص (مثلاً طارق يسدد لعاصم)، يُسجَّل دين مباشر بين الشريكين. يظهر الدين في جدول «مديونيات بين الشركاء» حتى يتم تصفيته بعملية رد عكسية."
                : "When partner A directly pays partner B's dues from their own pocket, a direct debt is recorded between them. Shown in the inter-partner debts table until cleared.",
            badge: { text: lang === "ar" ? "دين بين شريكين" : "P2P Debt", variant: "outline" },
          },
          {
            title: lang === "ar" ? "رصيد مصاريف الشركة (المقر والتشغيل)" : "Company Operational Overhead Balance",
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
                ? "الرصيد النهائي = المستحقات المعلقة (مدفوعة من الجيب) + حصص الأرباح المحققة + رصيد مصاريف الشركة"
                : "Balance = Pending Reimbursements + Realized Profit Shares + Company Overhead Balance",
            explanation:
              lang === "ar"
                ? "الرصيد يمثل صافي المركز المالي للشريك: الرصيد الأخضر (+) يعني مستحقات واجبة السداد للشريك، والرصيد الأحمر (−) يعني مبالغ مستحقة عليه لتغطية التكاليف التشغيلية، و0.00 ج.م يعني تسوية وتطابق الحسابات بالكامل."
                : "Positive balance (green) indicates net dues owed to the partner; negative balance (red) represents operating expenses owed by the partner.",
          },
        ]}
        tips={[
          lang === "ar"
            ? "تسوية الديون بين الشركاء: سجِّل عملية «رد مبلغ» في صفحة مصاريف الشركة بحيث يكون الشريك المدين هو «مصدر الدفع» والشريك الدائن هو «المستفيد» — سيتم تصفير الدين تلقائياً."
            : "To settle inter-partner debts: record a payout with the debtor as the paying source and creditor as recipient — the debt clears automatically.",
          lang === "ar"
            ? "تسوية المشاريع: تتم من خلال صفحة «رأس مال الشركة والخزنة» أو صفحة كل مشروع، حيث تُقتسم الأرباح ويستلمها الشركاء مباشرة."
            : "Project settlements: Executed in the Treasury or project details page, with direct payouts to partners.",
          lang === "ar"
            ? "مصاريف الشركة: تابع الفواتير الدورية ونسب مساهمة كل شريك من خلال تبويب «مصاريف الشركة»."
            : "Company overhead: Track recurring bills and partner contributions in the Company Expenses tab.",
        ]}
      />
    </div>
  );
}

