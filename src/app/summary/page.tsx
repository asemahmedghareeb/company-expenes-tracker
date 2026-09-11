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
import { formatDate, formatEGP } from "@/lib/format";
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

  const stats = [
    { label: t.fixed, value: summary.fixedTotal },
    { label: t.variable, value: summary.variableTotal },
    { label: t.direct, value: summary.directTotal },
    { label: t.monthTotal, value: summary.monthTotal },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <MonthPicker month={month} label={t.chooseMonth} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl">{formatEGP(s.value, lang)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.colBalance}</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryRows lang={lang} rows={summary.rows} />
        </CardContent>
      </Card>

      {summary.clientCoveredTotal > 0.005 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {t.excludedTitle}
              <Badge variant="secondary">{t.kindClient}</Badge>
            </CardTitle>
            <CardDescription>{t.excludedDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.excludedTotal}</span>
              <span dir="ltr" className="font-mono font-semibold tabular-nums">
                {formatEGP(summary.clientCoveredTotal, lang)}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colTitle}</TableHead>
                  <TableHead>{t.colDate}</TableHead>
                  <TableHead className="text-end">{t.colAmount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.clientCoveredLines.map((d, i) => (
                  <TableRow key={`client-${i}`}>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{formatDate(d.date, lang)}</TableCell>
                    <TableCell dir="ltr" className="text-end font-mono tabular-nums">
                      {formatEGP(d.amount, lang)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.details}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colKind}</TableHead>
                <TableHead>{t.colTitle}</TableHead>
                <TableHead className="text-end">{t.colAmount}</TableHead>
                <TableHead>{t.colPaidBy}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.details.map((d, i) => (
                <TableRow key={`${d.kind}-${i}`}>
                  <TableCell>
                    <Badge variant="outline">
                      {d.kind === "fixed"
                        ? t.kindFixed
                        : d.kind === "variable"
                          ? t.kindVariable
                          : t.kindProject}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.title}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatEGP(d.amount, lang)}
                  </TableCell>
                  <TableCell>{d.paidByName}</TableCell>
                </TableRow>
              ))}
              {summary.details.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t.empty}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
