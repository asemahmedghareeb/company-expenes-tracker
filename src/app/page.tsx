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
import { ArrowRight, Plus } from "lucide-react";

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

  const stats = [
    { label: t.stats.inflow, value: overview.totalInflow },
    { label: t.stats.expenses, value: overview.totalExpenses },
    { label: t.stats.netProfit, value: overview.netProfit },
    { label: t.stats.outstanding, value: overview.outstandingReimbursements },
    { label: t.stats.drawings, value: overview.totalDrawings },
    { label: t.stats.contractValue, value: overview.totalContractValue },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.firmOverview}</h1>
          <p className="text-sm text-muted-foreground">
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
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl">{formatEGP(s.value, lang)}</CardTitle>
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
                      className={`text-end font-semibold ${l.balance < 0 ? "text-red-600" : "text-emerald-700"}`}
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
                className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent"
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
