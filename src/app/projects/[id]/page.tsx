import { notFound } from "next/navigation";
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
import { formatDate, formatMoney, formatPct } from "@/lib/format";
import { getPartners, getProjectDetail } from "@/actions/queries";
import {
  ExpenseForm,
  PaymentForm,
  ProjectSplitsEditor,
  ReimburseButton,
} from "@/components/forms/transaction-forms";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, partners] = await Promise.all([
    getProjectDetail(id).catch(() => null),
    getPartners().catch(() => []),
  ]);
  if (!detail) notFound();
  const { project, financials, settlement } = detail;

  const partnerName = (pid: string) =>
    partners.find((p) => p.id === pid)?.name ??
    project.projectPartners.find((s) => s.partnerId === pid)?.partner.name ??
    pid.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project.description ?? "No description."}
          </p>
        </div>
        <Badge
          variant={
            project.status === "ACTIVE"
              ? "success"
              : project.status === "COMPLETED"
                ? "default"
                : "secondary"
          }
        >
          {project.status}
        </Badge>
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Contract value", value: Number(project.contractValue) },
          { label: "Total inflow", value: financials.totalInflow },
          { label: "Total expenses", value: financials.totalExpenses },
          { label: "Realized net profit", value: financials.netProfit },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-xl">{formatMoney(s.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding reimbursements (settle first)</CardDescription>
            <CardTitle className="text-xl">
              {formatMoney(financials.outstandingReimbursements)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash after reimbursements</CardDescription>
            <CardTitle className="text-xl">
              {formatMoney(financials.cashAfterReimbursements)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Settlement plan */}
      <Card>
        <CardHeader>
          <CardTitle>Settlement plan</CardTitle>
          <CardDescription>
            ① Reimburse out-of-pocket expenses ② Split net profit by snapshot
            equity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">Reimbursement due</TableHead>
                <TableHead className="text-right">Profit share</TableHead>
                <TableHead className="text-right">Total owed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlement.totalOwedPerPartner.map((row) => {
                const share = settlement.profitShares.find(
                  (p) => p.partnerId === row.partnerId,
                );
                const reimb = settlement.reimbursementsDue.find(
                  (r) => r.partnerId === row.partnerId,
                );
                return (
                  <TableRow key={row.partnerId}>
                    <TableCell className="font-medium">
                      {partnerName(row.partnerId)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPct(share?.sharePercentage ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(reimb?.amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatMoney(share?.amount ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatMoney(row.amount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Equity snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>Project equity snapshot</CardTitle>
            <CardDescription>
              Historic & immutable — editing affects only this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectSplitsEditor
              projectId={project.id}
              initial={project.projectPartners.map((s) => ({
                partnerId: s.partnerId,
                name: s.partner.name,
                sharePercentage: s.sharePercentage,
              }))}
            />
          </CardContent>
        </Card>

        {/* Record payment */}
        <Card>
          <CardHeader>
            <CardTitle>Record client payment</CardTitle>
            <CardDescription>Milestone inflow from the client.</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm projectId={project.id} />
          </CardContent>
        </Card>
      </div>

      {/* Payments table */}
      <Card>
        <CardHeader>
          <CardTitle>Client payments ({project.clientPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.clientPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paidAt)}</TableCell>
                  <TableCell>{p.milestoneLabel ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(Number(p.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {project.clientPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Log out-of-pocket expense</CardTitle>
            <CardDescription>Paid from a partner&apos;s personal money.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              projectId={project.id}
              partners={partners.map((p) => ({ id: p.id, name: p.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How reimbursement works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              1. Partner pays from personal money → expense logged as{" "}
              <Badge variant="warning">Pending</Badge>.
            </p>
            <p>
              2. Client payment arrives → click{" "}
              <span className="font-medium text-foreground">Mark reimbursed</span>{" "}
              to settle that partner first.
            </p>
            <p>
              3. Remaining net profit (inflow − all expenses) splits by the
              snapshot % above.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses table */}
      <Card>
        <CardHeader>
          <CardTitle>Operational expenses ({project.expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.expenseDate)}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.paidBy.name}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.isReimbursed ? "success" : "warning"}>
                      {e.isReimbursed ? "Reimbursed" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ReimburseButton expenseId={e.id} isReimbursed={e.isReimbursed} />
                  </TableCell>
                </TableRow>
              ))}
              {project.expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No expenses logged yet.
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
