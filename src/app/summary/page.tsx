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
import { formatEGP, formatPct } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { getMonthlySummary, toNumber } from "@/lib/ledger";
import { getSummaryData } from "@/actions/queries";
import { MonthPicker } from "./month-picker";

export const dynamic = "force-dynamic";

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colPartner}</TableHead>
                <TableHead className="text-end">{t.colPaid}</TableHead>
                <TableHead className="text-end">{t.colOwe}</TableHead>
                <TableHead className="text-end">{t.colBalance}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.rows.map((r) => (
                <TableRow key={r.partnerId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-end">{formatEGP(r.paid, lang)}</TableCell>
                  <TableCell className="text-end">
                    {formatEGP(r.share, lang)} ({formatPct(r.sharePercentage)})
                  </TableCell>
                  <TableCell
                    className={`text-end font-semibold ${r.balance > 0 ? "text-emerald-700" : r.balance < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  >
                    {formatEGP(Math.abs(r.balance), lang)}{" "}
                    {r.balance > 0 ? t.toHim : r.balance < 0 ? t.owes : t.settled}
                  </TableCell>
                </TableRow>
              ))}
              {summary.rows.length === 0 && (
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
