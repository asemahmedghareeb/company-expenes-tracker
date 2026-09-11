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

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const lang = await getLang();
  const t = dict[lang];

  let data: Awaited<ReturnType<typeof getDashboardData>> | null = null;
  let dbError: string | null = null;
  try {
    data = await getDashboardData();
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
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">
              <Plus className="h-4 w-4" /> {t.newProject}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ledger">
              {t.viewLedger} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="group overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
              <div className="space-y-1.5">
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums tracking-tight">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.partnerBalances}</CardTitle>
            <CardDescription>{t.balancesSubtitle}</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <TableCell className="font-medium">{l.partnerName}</TableCell>
                    <TableCell className="text-end">
                      {formatEGP(l.pendingReimbursements, lang)}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatEGP(l.realizedProfitShare, lang)}
                    </TableCell>
                    <TableCell
                      className={`text-end font-semibold tabular-nums ${l.balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t.projects}</CardTitle>
              <CardDescription>{t.projectsSubtitle}</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">{t.allProjects}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectCards.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 p-3 transition-all duration-200 hover:-translate-y-px hover:bg-accent hover:shadow-md"
              >
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.in} {formatEGP(p.financials.totalInflow, lang)} · {t.out}{" "}
                    {formatEGP(p.financials.totalExpenses, lang)} · {t.net}{" "}
                    {formatEGP(p.financials.netProfit, lang)}
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
