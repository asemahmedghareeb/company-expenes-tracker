import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { parseRangeParams } from "@/lib/range";
import { getDashboardData } from "@/actions/queries";
import {
  ArrowRight,
  Briefcase,
  Coins,
  Construction,
  HandCoins,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { RangeFilter } from "./range-filter";

// Cached by default — mutations revalidate on demand via revalidatePath()
// in src/actions/*.ts. Uses searchParams/cookies, so Next renders it
// dynamically per request without blanket force-dynamic.

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    month?: string;
    year?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const lang = await getLang();
  const t = dict[lang];
  const range = parseRangeParams(await searchParams);

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dbError: string | null = null;
  try {
    data = await getDashboardData(
      range.bounds
        ? { from: range.bounds.from, toExclusive: range.bounds.toExclusive }
        : undefined,
    );
  } catch (e) {
    dbError =
      e instanceof Error ? e.message : "Database connection failed.";
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t.dbTitle}</CardTitle>
            <CardDescription>{t.dbDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 ps-5 text-muted-foreground">
              <li>
                Copy <code>.env.example</code> to <code>.env</code> and set{" "}
                <code>DATABASE_URL</code>.
              </li>
              <li>
                Run <code>npx prisma db push</code> then{" "}
                <code>npm run db:seed</code>.
              </li>
              <li>{t.dbRefresh}</li>
            </ol>
            {dbError && (
              <p className="rounded-md bg-muted p-3 font-mono text-xs break-all">
                {dbError}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, ledgers, projectCards } = data;
  const companyTotals = (
    data as { companyTotals?: { fixed: number; variable: number; total: number } }
  ).companyTotals ?? {
    fixed: overview.totalFixedExpenses ?? 0,
    variable: overview.totalVariableExpenses ?? 0,
    total: overview.totalCompanyExpenses ?? 0,
  };
  const totalExpensesValue =
    overview.totalExpenses + (overview.totalCompanyExpenses ?? companyTotals.total);

  const stats = [
    {
      label: t.stats.inflow,
      value: overview.totalInflow,
      icon: TrendingUp,
      tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: t.stats.project,
      value: overview.totalExpenses,
      icon: Construction,
      tint: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    },
    {
      label: t.stats.fixed,
      value: companyTotals.fixed,
      icon: Landmark,
      tint: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    },
    {
      label: t.stats.variable,
      value: companyTotals.variable,
      icon: Coins,
      tint: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    },
    {
      label: t.stats.expenses,
      value: totalExpensesValue,
      hint: t.stats.expensesHint,
      icon: TrendingDown,
      tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    {
      label: t.stats.netProfit,
      value: overview.netProfitAfterCompany ?? overview.netProfit,
      hint: t.stats.netProfitHint,
      icon: PiggyBank,
      tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      label: t.stats.outstanding,
      value: overview.outstandingReimbursements,
      icon: Receipt,
      tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: t.stats.drawings,
      value: overview.totalDrawings,
      icon: HandCoins,
      tint: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      label: t.stats.contractValue,
      value: overview.totalContractValue,
      icon: Briefcase,
      tint: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl dark:from-indigo-300 dark:via-indigo-200 dark:to-sky-300">
            {t.firmOverview}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.overviewSubtitle(overview.projectCount, overview.activePartnerCount)}
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button asChild variant="outline" className="flex-1 sm:flex-initial">
            <Link href="/projects">
              <Plus className="h-4 w-4" /> {t.newProject}
            </Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link href="/ledger">
              {t.viewLedger} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>

      <RangeFilter
        lang={lang}
        mode={range.mode}
        month={range.month}
        year={range.year}
        fromStr={range.fromStr}
        toStr={range.toStr}
      />

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
          >
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <div className="space-y-1">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-xl sm:text-2xl tabular-nums tracking-tight">
                  {formatEGP(s.value, lang)}
                </CardTitle>
                {"hint" in s && s.hint ? (
                  <p className="text-xs text-muted-foreground">{s.hint as string}</p>
                ) : null}
              </div>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 ${s.tint}`}
              >
                <s.icon className="h-5 w-5" />
              </span>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>{t.partnerBalances}</CardTitle>
            <CardDescription>{t.balancesSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {/* Mobile card view */}
            <div className="space-y-2.5 sm:hidden">
              {ledgers.map((l) => (
                <div
                  key={l.partnerId}
                  className="rounded-xl border border-border/70 bg-card p-3 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {l.partnerName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="font-semibold text-sm">{l.partnerName}</span>
                    </div>
                    <span
                      className={`font-semibold text-sm tabular-nums ${
                        l.balance < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatEGP(l.balance, lang)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/50">
                    <span>
                      {t.table.pending}:{" "}
                      <strong className="text-foreground font-mono">
                        {formatEGP(l.pendingReimbursements, lang)}
                      </strong>
                    </span>
                    <span>
                      {t.table.profit}:{" "}
                      <strong className="text-foreground font-mono">
                        {formatEGP(l.realizedProfitShare, lang)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
              {ledgers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-3">
                  {t.noPartners}{" "}
                  <Link href="/partners" className="underline">
                    {t.addOne}
                  </Link>
                </p>
              )}
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.table.partner}</TableHead>
                    <TableHead className="text-end">{t.table.pending}</TableHead>
                    <TableHead className="text-end">{t.table.profit}</TableHead>
                    <TableHead className="text-end">{t.table.balance}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgers.map((l) => (
                    <TableRow key={l.partnerId}>
                      <TableCell className="font-medium whitespace-nowrap">{l.partnerName}</TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {formatEGP(l.pendingReimbursements, lang)}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {formatEGP(l.realizedProfitShare, lang)}
                      </TableCell>
                      <TableCell
                        className={`text-end font-semibold tabular-nums whitespace-nowrap ${
                          l.balance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {formatEGP(l.balance, lang)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ledgers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {t.noPartners}{" "}
                        <Link href="/partners" className="underline">
                          {t.addOne}
                        </Link>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t.projects}</CardTitle>
              <CardDescription>{t.projectsSubtitle}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">{t.allProjects}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 min-w-0">
            {projectCards.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/60 p-3 transition-all duration-200 hover:-translate-y-px hover:bg-accent hover:shadow-md min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-sm sm:text-base">{p.name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                    <span>
                      {t.in} {formatEGP(p.financials.totalInflow, lang)}
                    </span>
                    <span>·</span>
                    <span>
                      {t.out} {formatEGP(p.financials.totalExpenses, lang)}
                    </span>
                    <span>·</span>
                    <span className="font-semibold text-foreground">
                      {t.net} {formatEGP(p.financials.netProfit, lang)}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    p.status === "ACTIVE"
                      ? "success"
                      : p.status === "COMPLETED"
                        ? "default"
                        : "secondary"
                  }
                  className="shrink-0"
                >
                  {p.status}
                </Badge>
              </Link>
            ))}
            {projectCards.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t.noProjects}{" "}
                <Link href="/projects" className="underline">
                  {t.createOne}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
