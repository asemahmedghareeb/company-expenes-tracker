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
import { formatDate, formatEGP, formatPct } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { getPartners, getProjectDetail } from "@/actions/queries";
import {
  DeleteProjectButton,
  EditProjectForm,
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
  const lang = await getLang();
  const t = dict[lang];
  const td = t.projectDetail;

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
            {project.description ?? td.noDescription}
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
          {t.projectForm.statuses[project.status]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit metadata */}
        <Card>
          <CardHeader>
            <CardTitle>{td.editTitle}</CardTitle>
            <CardDescription>{td.editDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <EditProjectForm
              lang={lang}
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                contractValue: Number(project.contractValue),
                status: project.status,
              }}
            />
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>{td.deleteTitle}</CardTitle>
            <CardDescription>{td.deleteDesc(project.name)}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteProjectButton projectId={project.id} lang={lang} />
          </CardContent>
        </Card>
      </div>

      {/* Financial summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: td.contractValue, value: Number(project.contractValue) },
          { label: td.inflow, value: financials.totalInflow },
          { label: td.expenses, value: financials.totalExpenses },
          { label: td.netProfit, value: financials.netProfit },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-xl">{formatEGP(s.value, lang)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{td.outstanding}</CardDescription>
            <CardTitle className="text-xl">
              {formatEGP(financials.outstandingReimbursements, lang)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{td.cashAfter}</CardDescription>
            <CardTitle className="text-xl">
              {formatEGP(financials.cashAfterReimbursements, lang)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Settlement plan */}
      <Card>
        <CardHeader>
          <CardTitle>{td.settlement}</CardTitle>
          <CardDescription>{td.settlementDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colPartner}</TableHead>
                <TableHead className="text-end">{td.colShare}</TableHead>
                <TableHead className="text-end">{td.colReimb}</TableHead>
                <TableHead className="text-end">{td.colProfit}</TableHead>
                <TableHead className="text-end">{td.colOwed}</TableHead>
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
                    <TableCell className="text-end">
                      {formatPct(share?.sharePercentage ?? 0)}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatEGP(reimb?.amount ?? 0, lang)}
                    </TableCell>
                    <TableCell className="text-end">
                      {formatEGP(share?.amount ?? 0, lang)}
                    </TableCell>
                    <TableCell className="text-end font-semibold">
                      {formatEGP(row.amount, lang)}
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
            <CardTitle>{td.snapshotTitle}</CardTitle>
            <CardDescription>{td.snapshotDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectSplitsEditor
              projectId={project.id}
              lang={lang}
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
            <CardTitle>{td.recordPayment}</CardTitle>
            <CardDescription>{td.recordPaymentDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentForm projectId={project.id} lang={lang} />
          </CardContent>
        </Card>
      </div>

      {/* Payments table */}
      <Card>
        <CardHeader>
          <CardTitle>{td.paymentsTitle(project.clientPayments.length)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colDate}</TableHead>
                <TableHead>{td.colMilestone}</TableHead>
                <TableHead className="text-end">{td.colAmount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.clientPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paidAt, lang)}</TableCell>
                  <TableCell>{p.milestoneLabel ?? "—"}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatEGP(Number(p.amount), lang)}
                  </TableCell>
                </TableRow>
              ))}
              {project.clientPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {td.noPayments}
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
            <CardTitle>{td.logExpense}</CardTitle>
            <CardDescription>{td.logExpenseDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              projectId={project.id}
              lang={lang}
              partners={partners.map((p) => ({ id: p.id, name: p.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{td.howTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {td.how1} <Badge variant="warning">{td.pending}</Badge>.
            </p>
            <p>
              {td.how2pre}{" "}
              <span className="font-medium text-foreground">{td.howMark}</span>{" "}
              {td.how2post}
            </p>
            <p>{td.how3}</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses table */}
      <Card>
        <CardHeader>
          <CardTitle>{td.expensesTitle(project.expenses.length)}</CardTitle>
          {financials.clientCoveredTotal > 0 && (
            <CardDescription>
              {td.clientCovered}: {formatEGP(financials.clientCoveredTotal, lang)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colDate}</TableHead>
                <TableHead>{td.colDesc}</TableHead>
                <TableHead>{td.colPaidBy}</TableHead>
                <TableHead className="text-end">{td.colAmount}</TableHead>
                <TableHead>{td.colStatus}</TableHead>
                <TableHead className="text-end">{td.colAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{formatDate(e.expenseDate, lang)}</TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{e.paidBy?.name ?? td.clientPaid}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatEGP(Number(e.amount), lang)}
                  </TableCell>
                  <TableCell>
                    {!e.paidBy ? (
                      <Badge variant="secondary">{td.clientPaid}</Badge>
                    ) : (
                      <Badge variant={e.isReimbursed ? "success" : "warning"}>
                        {e.isReimbursed ? td.reimbursed : td.pending}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {!e.paidBy ? (
                      "—"
                    ) : (
                      <ReimburseButton expenseId={e.id} isReimbursed={e.isReimbursed} lang={lang} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {project.expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {td.noExpenses}
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
