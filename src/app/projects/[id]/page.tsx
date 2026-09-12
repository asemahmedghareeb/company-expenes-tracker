import { notFound } from "next/navigation";
import { AlertCircle, Wallet } from "lucide-react";
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
import { cn, formatDate, formatEGP, formatPct } from "@/lib/format";
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
  const { project, financials, settlement, custody } = detail;

  const partnerName = (pid: string) =>
    partners.find((p) => p.id === pid)?.name ??
    project.projectPartners.find((s) => s.partnerId === pid)?.partner.name ??
    pid.slice(0, 8);

  const outOfPocketCount = project.expenses.filter(
    (e) => !e.deductFromCustody && e.paidBy && !e.isReimbursed,
  ).length;

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

      {/* Financial summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: td.contractValue, value: Number(project.contractValue) },
          { label: td.expenses, value: financials.totalExpenses },
          {
            label: td.contractProfit,
            value: financials.contractNetProfit,
            highlight: true,
          },
          { label: td.inflow, value: financials.totalInflow },
          { label: td.remainingUncollected, value: custody.remainingUncollected },
          { label: td.netProfit, value: financials.netProfit },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle
                className={cn(
                  "text-xl",
                  s.highlight && "text-emerald-600 dark:text-emerald-400 font-bold",
                )}
              >
                {formatEGP(s.value, lang)}
              </CardTitle>
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
            <CardDescription>{td.totalCustodyHeld}</CardDescription>
            <CardTitle className="text-xl text-emerald-600 dark:text-emerald-400">
              {formatEGP(custody.totalCustodyHeld, lang)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Current Cash Holders Table (أمناء العهدة الحاليين للمشروع) */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {td.cashHoldersTitle}
              </CardTitle>
              <CardDescription>{td.cashHoldersDesc}</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
              {td.totalCustodyHeld}: {formatEGP(custody.totalCustodyHeld, lang)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{td.colPartner}</TableHead>
                <TableHead className="text-end">{td.colInflow}</TableHead>
                <TableHead className="text-end">{td.colOutflow}</TableHead>
                <TableHead className="text-end">{td.colNetCustody}</TableHead>
                <TableHead className="text-center">{td.colStatus}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custody.partners.map((row) => (
                <TableRow key={row.partnerId}>
                  <TableCell className="font-medium">
                    {row.partnerName}
                  </TableCell>
                  <TableCell dir="ltr" className="text-end font-mono text-muted-foreground">
                    {formatEGP(row.inflow, lang)}
                  </TableCell>
                  <TableCell dir="ltr" className="text-end font-mono text-muted-foreground">
                    {formatEGP(row.outflow, lang)}
                  </TableCell>
                  <TableCell
                    dir="ltr"
                    className={cn(
                      "text-end font-mono font-semibold",
                      row.netCustody > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {formatEGP(row.netCustody, lang)}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.isCashHolder ? (
                      <Badge variant="success" className="gap-1">
                        <Wallet className="h-3 w-3" />
                        {td.holdingCash}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">{td.noCustody}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {custody.partners.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {td.noCustody}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Out-of-pocket Alert Indicator */}
      {outOfPocketCount > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <div className="font-semibold text-sm">
              {td.outOfPocketAlert} ({outOfPocketCount})
            </div>
            <div className="text-xs text-muted-foreground">
              {td.outOfPocketDesc}
            </div>
          </div>
        </div>
      )}

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
            <PaymentForm
              projectId={project.id}
              lang={lang}
              partners={project.projectPartners.map((s) => ({
                id: s.partnerId,
                name: s.partner.name,
              }))}
            />
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
                <TableHead>{td.colReceivedBy}</TableHead>
                <TableHead className="text-end">{td.colAmount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.clientPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.paidAt, lang)}</TableCell>
                  <TableCell>{p.milestoneLabel ?? "—"}</TableCell>
                  <TableCell>{p.receivedBy?.name ?? "—"}</TableCell>
                  <TableCell className="text-end font-medium">
                    {formatEGP(Number(p.amount), lang)}
                  </TableCell>
                </TableRow>
              ))}
              {project.clientPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
              custodyBreakdown={custody.partners}
              projectName={project.name}
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
                    ) : e.deductFromCustody ? (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                        <Wallet className="h-3 w-3" />
                        {td.deductedFromCustodyBadge}
                      </Badge>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={e.isReimbursed ? "success" : "warning"}>
                          {e.isReimbursed ? td.reimbursed : td.pending}
                        </Badge>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px] gap-1">
                          <AlertCircle className="h-2.5 w-2.5" />
                          {td.outOfPocketBadge}
                        </Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {!e.paidBy || e.deductFromCustody ? (
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
