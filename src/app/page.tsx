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
import { formatMoney } from "@/lib/format";
import { getDashboardData } from "@/actions/queries";
import { ArrowRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
            <CardTitle>Database not connected</CardTitle>
            <CardDescription>
              Set DATABASE_URL to a PostgreSQL database to go live.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>
                Copy <code>.env.example</code> to <code>.env</code> and set{" "}
                <code>DATABASE_URL</code>.
              </li>
              <li>
                Run <code>npx prisma db push</code> then{" "}
                <code>npm run db:seed</code>.
              </li>
              <li>Refresh this page.</li>
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
    { label: "Total inflow", value: overview.totalInflow },
    { label: "Total expenses", value: overview.totalExpenses },
    { label: "Net profit", value: overview.netProfit },
    { label: "Outstanding reimbursements", value: overview.outstandingReimbursements },
    { label: "Total drawings", value: overview.totalDrawings },
    { label: "Contract value", value: overview.totalContractValue },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Firm overview</h1>
          <p className="text-sm text-muted-foreground">
            {overview.projectCount} projects · {overview.activePartnerCount}{" "}
            active partners · expenses settle before profit splits
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/projects">
              <Plus className="h-4 w-4" /> New project
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ledger">
              View ledger <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-2xl">{formatMoney(s.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Partner balances</CardTitle>
            <CardDescription>
              Pending reimbursements + profit shares − drawings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgers.map((l) => (
                  <TableRow key={l.partnerId}>
                    <TableCell className="font-medium">{l.partnerName}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(l.pendingReimbursements)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(l.realizedProfitShare)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${l.balance < 0 ? "text-red-600" : "text-emerald-700"}`}
                    >
                      {formatMoney(l.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                {ledgers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No partners yet.{" "}
                      <Link href="/partners" className="underline">
                        Add one
                      </Link>
                      .
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
              <CardTitle>Projects</CardTitle>
              <CardDescription>Realized net profit = inflow − expenses</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/projects">All projects</Link>
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
                    In {formatMoney(p.financials.totalInflow)} · Out{" "}
                    {formatMoney(p.financials.totalExpenses)} · Net{" "}
                    {formatMoney(p.financials.netProfit)}
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
                No projects yet.{" "}
                <Link href="/projects" className="underline">
                  Create one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
