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
import { toNumber } from "@/lib/ledger";
import { getTreasurySummary, suggestSettlements } from "@/lib/treasury";
import { getTreasuryData } from "@/actions/queries";
import { PageGuide } from "@/components/ui/page-guide";
import { Vault, History, CheckCircle2 } from "lucide-react";
import {
  SettlementExecutionDialog,
  DeleteSettlementButton,
} from "@/components/forms/settlement-dialog";

// Cached by default — mutations revalidate on demand via revalidatePath().

export default async function CapitalPage() {
  const lang = await getLang();
  const t = dict[lang].capital;
  const { partners, projects, settlements: executedSettlements, totalVaultBalance } =
    await getTreasuryData().catch(() => ({
      partners: [],
      projects: [],
      settlements: [],
      totalVaultBalance: 0,
    }));

  const dialogProjects = projects.map((p) => {
    const inflow = p.clientPayments.reduce((acc, pay) => acc + toNumber(pay.amount), 0);
    const outflow = p.expenses.reduce((acc, exp) => acc + toNumber(exp.amount), 0);
    return {
      id: p.id,
      name: p.name,
      contractValue: toNumber(p.contractValue),
      netCash: Math.max(0, inflow - outflow),
      splits: p.projectPartners.map((pp) => ({
        partnerId: pp.partnerId,
        sharePercentage: pp.sharePercentage,
      })),
    };
  });

  const { totalCollected, rows } = getTreasurySummary(
    partners.map((p) => ({ id: p.id, name: p.name })),
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      splits: p.projectPartners.map((s) => ({
        partnerId: s.partnerId,
        sharePercentage: s.sharePercentage,
      })),
      payments: p.clientPayments.map((x) => ({
        amount: toNumber(x.amount),
        receivedByPartnerId: x.receivedByPartnerId,
      })),
    })),
  );
  const settlements = suggestSettlements(rows);
  const holders = rows.filter((r) => r.cashHeld > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t.poolNote}</p>
        </div>
        <SettlementExecutionDialog
          partners={partners.map((p) => ({
            id: p.id,
            name: p.name,
            defaultSharePercentage: p.defaultSharePercentage,
            isActive: p.isActive,
          }))}
          projects={dialogProjects}
          totalPooledCash={totalCollected}
          lang={lang}
        />
      </div>

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل الخزينة وتوازن كاش الشركاء" : "Treasury & Cash Pool Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لتتبع الكاش الفعلي المحمول في يد الشركاء مقابل الأرباح المستحقة"
            : "Official reference for tracking cash held in hand vs earned profit distributions"
        }
        steps={[
          {
            title: lang === "ar" ? "الكاش المحمول في اليد (Cash in Hand)" : "Cash in Hand",
            text:
              lang === "ar"
                ? "إجمالي المبالغ النقدية المحصلة من دفعات العملاء والتي توجد حالياً في حساب أو حوزة شريك معين."
                : "Total client payments collected and physically held in a partner's personal or business account.",
            badge: { text: lang === "ar" ? "عهدة نقدية" : "Physical Cash", variant: "outline" },
          },
          {
            title: lang === "ar" ? "الأرباح المستحقة (Share Earned)" : "Earned Share",
            text:
              lang === "ar"
                ? "نصيب الشريك الشرعي والمحاسبي من إجمالي مبالغ العقود المحصلة وفق نسب المشاريع المتفق عليها."
                : "The amount a partner is legitimately entitled to keep from all collections based on project percentages.",
          },
          {
            title: lang === "ar" ? "صافي المركز والتسوية" : "Net Position & Settlement",
            text:
              lang === "ar"
                ? "إذا كان الكاش المحمول أكبر من أرباح الشريك، يظهر باللون الكهرماني/الأحمر كشريك مطالب بالتحويل. وإذا كان أقل، يظهر كشريك مستحق للاستلام."
                : "Partners with excess cash transfer to partners with a deficit according to the suggested plan.",
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "معادلة صافي الكاش (الفائض / العجز)" : "Net Cash Position Equation",
            formula:
              lang === "ar"
                ? "صافي الكاش = الكاش المحمول في يد الشريك − نصيب الشريك المستحق من الأرباح"
                : "Net Position = Cash Held in Hand − Share Earned from Projects",
            explanation:
              lang === "ar"
                ? "صافي موجب (+) يعني أن الشريك يحمل كاش فائض يجب تحويله، وصافي سالب (−) يعني أن الشريك له كاش مستحق التحويل إليه."
                : "Positive = Excess cash to transfer out; Negative = Deficit cash to receive.",
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalCollected}</CardDescription>
            <CardTitle dir="ltr" className="text-2xl font-mono tabular-nums">
              {formatEGP(totalCollected, lang)}
            </CardTitle>
            <CardDescription>{t.totalCollectedHint}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-indigo-200/80 bg-gradient-to-br from-card via-card to-indigo-50/40 dark:border-indigo-900/60 dark:to-indigo-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-indigo-900 dark:text-indigo-300 font-medium">
                {lang === "ar" ? "رصيد خزنة الشركة (الاحتياطي)" : "Company Reserve Vault"}
              </CardDescription>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Vault className="h-4 w-4" />
              </div>
            </div>
            <CardTitle dir="ltr" className="text-2xl font-mono tabular-nums text-indigo-900 dark:text-indigo-200">
              {formatEGP(totalVaultBalance, lang)}
            </CardTitle>
            <CardDescription>
              {lang === "ar"
                ? `${executedSettlements.length} تسويات نقدية منفذة`
                : `${executedSettlements.length} executed settlements`}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t.heldByTitle}</CardTitle>
            <CardDescription>{t.heldByDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {holders.map((r) => (
              <div key={r.partnerId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.partnerName}</span>
                  <span dir="ltr" className="font-mono tabular-nums">
                    {formatEGP(r.cashHeld, lang)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${totalCollected > 0 ? Math.min(100, (r.cashHeld / totalCollected) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {holders.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.noCash}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.tableTitle}</CardTitle>
          <CardDescription>{t.tableDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colPartner}</TableHead>
                <TableHead className="text-end">{t.colHeld}</TableHead>
                <TableHead className="text-end">{t.colEarned}</TableHead>
                <TableHead className="text-end">{t.colNet}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.partnerId}>
                  <TableCell className="font-medium">{r.partnerName}</TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    {formatEGP(r.cashHeld, lang)}
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    {formatEGP(r.earnedShare, lang)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Badge
                      variant={
                        r.net > 0.005
                          ? "destructive"
                          : r.net < -0.005
                            ? "success"
                            : "secondary"
                      }
                      className="font-mono tabular-nums"
                    >
                      {formatEGP(Math.abs(r.net), lang)}{" "}
                      {r.net > 0.005
                        ? t.owesPartners
                        : r.net < -0.005
                          ? t.owedByPartners
                          : t.balanced}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t.noPartners}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Suggested inter-partner settlements */}
      <Card>
        <CardHeader>
          <CardTitle>{t.settleTitle}</CardTitle>
          <CardDescription>{t.settleDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {settlements.map((s, i) => (
            <div
              key={`${s.fromPartnerId}-${s.toPartnerId}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.fromName}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{s.toName}</span>
              </span>
              <span dir="ltr" className="font-mono font-semibold tabular-nums">
                {formatEGP(s.amount, lang)}
              </span>
            </div>
          ))}
          {settlements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {rows.length === 0 || totalCollected === 0 ? t.noCash : t.settleAllClear}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Executed Settlements & Company Vault History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {lang === "ar"
                    ? "سجل التسويات وتوزيعات الخزنة المنفذة"
                    : "Executed Settlements & Vault History"}
                </span>
              </CardTitle>
              <CardDescription>
                {lang === "ar"
                  ? "سجل العمليات المعتمدة لتوزيع الأرباح وما تم إيداعه في خزنة الشركة ومسحوبات الشركاء."
                  : "Audit log of confirmed profit settlements, vault reserves withheld, and partner payouts."}
              </CardDescription>
            </div>
            {executedSettlements.length > 0 && (
              <Badge variant="outline" className="font-mono">
                {executedSettlements.length} {lang === "ar" ? "تسويات" : "Settlements"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {executedSettlements.length > 0 ? (
            <div className="space-y-3">
              {executedSettlements.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-border/80 bg-card p-4 space-y-3 transition-colors hover:border-border"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">
                          {s.title || (lang === "ar" ? "تسوية أرباح" : "Profit Settlement")}
                        </span>
                        {s.project && (
                          <Badge variant="secondary" className="text-xs">
                            {s.project.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          · {formatDate(s.settledAt, lang)}
                        </span>
                      </div>
                      {s.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-end">
                        <div className="text-xs text-muted-foreground">
                          {lang === "ar" ? "إجمالي المبلغ:" : "Total Settled:"}
                        </div>
                        <div className="font-mono font-bold text-sm">
                          {formatEGP(toNumber(s.totalAmount), lang)}
                        </div>
                      </div>
                      <DeleteSettlementButton id={s.id} lang={lang} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="rounded-lg bg-indigo-50/60 p-2.5 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40">
                      <div className="text-muted-foreground font-medium">
                        {lang === "ar" ? "مستقطع خزنة الشركة" : "Company Vault Cut"}
                      </div>
                      <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {formatEGP(toNumber(s.vaultAmount), lang)}{" "}
                        <span className="font-normal text-[11px]">({s.vaultPercentage}%)</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-50/60 p-2.5 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 sm:col-span-2">
                      <div className="text-muted-foreground font-medium mb-1">
                        {lang === "ar" ? "الموزع على الشركاء (سحب نقدي)" : "Distributed to Partners"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {s.distributions.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs border border-border/70 shadow-2xs"
                          >
                            <span className="font-medium text-foreground">{d.partner.name}:</span>
                            <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                              {formatEGP(toNumber(d.amount), lang)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({formatPct(d.percentage)})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-2">
              <Vault className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p>
                {lang === "ar"
                  ? "لم يتم تنفيذ أي تسويات نقدية حتى الآن."
                  : "No settlements have been executed yet."}
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {lang === "ar"
                  ? "اضغط على زر «تنفيذ تسوية وتوزيع أرباح» في أعلى الصفحة لتسوية الأرباح وتحديد نسبة خزنة الشركة وتوزيع الكاش على الشركاء."
                  : "Click 'Execute Profit Settlement' above to distribute cash and withhold vault reserves."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
