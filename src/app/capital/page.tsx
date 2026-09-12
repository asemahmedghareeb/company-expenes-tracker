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
import { formatEGP } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { toNumber } from "@/lib/ledger";
import { getTreasurySummary, suggestSettlements } from "@/lib/treasury";
import { getTreasuryData } from "@/actions/queries";
import { PageGuide } from "@/components/ui/page-guide";

// Cached by default — mutations revalidate on demand via revalidatePath().

export default async function CapitalPage() {
  const lang = await getLang();
  const t = dict[lang].capital;
  const { partners, projects } = await getTreasuryData().catch(() => ({
    partners: [],
    projects: [],
  }));

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.poolNote}</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.totalCollected}</CardDescription>
            <CardTitle dir="ltr" className="text-2xl font-mono tabular-nums">
              {formatEGP(totalCollected, lang)}
            </CardTitle>
            <CardDescription>{t.totalCollectedHint}</CardDescription>
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
    </div>
  );
}
