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
import Link from "next/link";
import { getTreasurySummary, suggestSettlements } from "@/lib/treasury";
import { getTreasuryData } from "@/actions/queries";
import { PageGuide } from "@/components/ui/page-guide";
import { Vault, History, CheckCircle2, FolderKanban, Receipt, ExternalLink } from "lucide-react";
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

  // Flatten all payments received by partners with full project attribution
  const allCustodyPayments = projects
    .flatMap((project) =>
      project.clientPayments.map((pay) => ({
        paymentId: pay.id,
        projectId: project.id,
        projectName: project.name,
        partnerId: pay.receivedByPartnerId,
        partnerName: pay.receivedBy?.name ?? "شريك",
        amount: toNumber(pay.amount),
        paidAt: pay.paidAt,
        milestoneLabel: pay.milestoneLabel,
        notes: pay.notes,
      })),
    )
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

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
              <div key={r.partnerId} className="space-y-1.5 rounded-lg border border-border/40 bg-muted/20 p-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{r.partnerName}</span>
                  <span dir="ltr" className="font-mono font-bold tabular-nums text-foreground">
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
                {/* Project attribution chips */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {r.perProject
                    .filter((p) => p.held > 0)
                    .map((p) => (
                      <span
                        key={p.projectId}
                        className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border/60"
                        title={p.projectName}
                      >
                        <FolderKanban className="h-2.5 w-2.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[110px]">{p.projectName || "مشروع"}</span>:
                        <span className="font-mono font-semibold text-primary" dir="ltr">
                          {formatEGP(p.held, lang)}
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            ))}
            {holders.length === 0 && (
              <p className="text-sm text-muted-foreground">{t.noCash}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Partner Custody Overview Table with Project Attribution */}
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
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {r.partnerName.slice(0, 1)}
                      </div>
                      <span>{r.partnerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-bold tabular-nums text-sm sm:text-base">
                        {formatEGP(r.cashHeld, lang)}
                      </span>
                      {r.cashHeld > 0 && (
                        <div className="mt-1 flex flex-col items-end gap-1">
                          {r.perProject
                            .filter((p) => p.held > 0)
                            .map((p) => (
                              <Link
                                key={p.projectId}
                                href={`/projects/${p.projectId}`}
                                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50/70 dark:bg-indigo-950/40 px-2 py-0.5 text-[11px] border border-indigo-200/60 dark:border-indigo-900/40 hover:bg-indigo-100/70 transition-colors"
                              >
                                <FolderKanban className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span className="text-foreground font-medium">{p.projectName}</span>
                                <span className="text-muted-foreground font-mono">·</span>
                                <span className="font-mono font-semibold text-indigo-700 dark:text-indigo-300" dir="ltr">
                                  {formatEGP(p.held, lang)}
                                </span>
                              </Link>
                            ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-medium tabular-nums text-sm sm:text-base">
                        {formatEGP(r.earnedShare, lang)}
                      </span>
                      {r.earnedShare > 0 && (
                        <div className="mt-1 flex flex-col items-end gap-1 text-[11px] text-muted-foreground">
                          {r.perProject
                            .filter((p) => p.earned > 0)
                            .map((p) => (
                              <div key={p.projectId} className="inline-flex items-center gap-1 text-muted-foreground">
                                <span>{p.projectName}:</span>
                                <span className="font-mono font-medium text-foreground" dir="ltr">
                                  {formatEGP(p.earned, lang)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
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

      {/* Detailed Project Cash Sources & Custody Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <CardTitle className="text-lg">
              {lang === "ar"
                ? "كشف مصادر النقدية والعهد الممسوكة (تبع أي مشروع؟)"
                : "Cash Inflows & Custody Sources by Project"}
            </CardTitle>
          </div>
          <CardDescription>
            {lang === "ar"
              ? "بيان تفصيلي يوضح كل دفعة نقدية استلمها أي شريك في يده، تاريخ استلامها، والمشروع التابع لها بالكامل."
              : "Detailed ledger of every client payment received, showing the recipient partner and associated project."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "ar" ? "الشريك الحائز للكاش" : "Holding Partner"}</TableHead>
                <TableHead>{lang === "ar" ? "المشروع التابع له" : "Project"}</TableHead>
                <TableHead>{lang === "ar" ? "بيان الدفعة / المرحلة" : "Milestone / Description"}</TableHead>
                <TableHead>{lang === "ar" ? "تاريخ الاستلام" : "Received Date"}</TableHead>
                <TableHead className="text-end">{lang === "ar" ? "المبلغ المحصل" : "Amount Received"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCustodyPayments.map((pay) => (
                <TableRow key={pay.paymentId}>
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                        {pay.partnerName.slice(0, 1)}
                      </div>
                      <span>{pay.partnerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projects/${pay.projectId}`}
                      className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                    >
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span>{pay.projectName}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm">
                    {pay.milestoneLabel || pay.notes || (lang === "ar" ? "دفعة من العميل" : "Client Payment")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDate(pay.paidAt, lang)}
                  </TableCell>
                  <TableCell className="text-end font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {formatEGP(pay.amount, lang)}
                  </TableCell>
                </TableRow>
              ))}
              {allCustodyPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    {lang === "ar" ? "لا توجد دفعات محصلة مسجلة حتى الآن." : "No client payments recorded yet."}
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
    </div>
  );
}
