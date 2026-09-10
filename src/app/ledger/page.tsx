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
import { formatDate, formatMoney } from "@/lib/format";
import { getLedgerData, getPartners } from "@/actions/queries";
import { DrawingForm } from "@/components/forms/transaction-forms";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const [data, partners] = await Promise.all([
    getLedgerData().catch(() => null),
    getPartners().catch(() => []),
  ]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ledger unavailable</CardTitle>
          <CardDescription>Connect the database to view live balances.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { ledgers, drawings, pendingExpenses } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partner ledger</h1>
        <p className="text-sm text-muted-foreground">
          Balance = Pending reimbursements + Realized profit shares − Drawings
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ledgers.map((l) => (
          <Card key={l.partnerId}>
            <CardHeader className="pb-2">
              <CardDescription>{l.partnerName}</CardDescription>
              <CardTitle
                className={`text-2xl ${l.balance < 0 ? "text-red-600" : "text-emerald-700"}`}
              >
                {formatMoney(l.balance)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending reimb.</span>
                <span>{formatMoney(l.pendingReimbursements)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit share</span>
                <span>{formatMoney(l.realizedProfitShare)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drawings</span>
                <span>−{formatMoney(l.totalDrawings)}</span>
              </div>
              {l.breakdown.length > 0 && (
                <div className="pt-2">
                  {l.breakdown.map((b) => (
                    <div
                      key={b.projectId}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>
                        {b.projectName ?? b.projectId.slice(0, 8)} ({b.sharePercentage}%)
                      </span>
                      <span>{formatMoney(b.totalOwed)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {ledgers.length === 0 && (
          <p className="text-sm text-muted-foreground">No partners yet.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record drawing</CardTitle>
            <CardDescription>Partner cash withdrawal against balance.</CardDescription>
          </CardHeader>
          <CardContent>
            <DrawingForm
              partners={partners.map((p) => ({ id: p.id, name: p.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending reimbursements</CardTitle>
            <CardDescription>Out-of-pocket expenses awaiting settlement.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Partner</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExpenses.slice(0, 10).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.project.name}</TableCell>
                    <TableCell>{e.paidBy.name}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(Number(e.amount))}
                    </TableCell>
                  </TableRow>
                ))}
                {pendingExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nothing pending — all settled. ✓
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent drawings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawings.slice(0, 20).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDate(d.drawnAt)}</TableCell>
                  <TableCell className="font-medium">{d.partner.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatMoney(Number(d.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {drawings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No drawings recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formula reference</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="warning">Pending = Σ expenses where isReimbursed = false</Badge>
          <Badge variant="secondary">
            Profit = Σ (project inflow − project expenses) × snapshot %
          </Badge>
          <Badge variant="outline">Balance = Pending + Profit − Drawings</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
