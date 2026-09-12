"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEGP, type Lang } from "@/lib/format";
import { dict } from "@/lib/dict";
import { Pagination } from "@/components/ui/pagination";
import {
  DeleteExpenseButton,
  ReimburseButton,
} from "@/components/forms/transaction-forms";

/* -------------------- Client Payments Table with Pagination -------------------- */

export interface ClientPaymentRowData {
  id: string;
  amount: number;
  paidAt: string | Date;
  milestoneLabel?: string | null;
  receivedBy?: { id: string; name: string } | null;
}

export function PaginatedClientPaymentsTable({
  payments,
  lang,
}: {
  payments: ClientPaymentRowData[];
  lang: Lang;
}) {
  const td = dict[lang].projectDetail;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const totalPages = Math.ceil(payments.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return payments.slice(start, start + PAGE_SIZE);
  }, [payments, page]);

  return (
    <div className="space-y-3">
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
          {paginated.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatDate(p.paidAt, lang)}</TableCell>
              <TableCell>{p.milestoneLabel ?? "—"}</TableCell>
              <TableCell>{p.receivedBy?.name ?? "—"}</TableCell>
              <TableCell className="text-end font-medium font-mono">
                {formatEGP(p.amount, lang)}
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                {td.noPayments}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={payments.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "دفعة" : "payments"}
      />
    </div>
  );
}

/* -------------------- Project Expenses Table with Pagination -------------------- */

export interface ProjectExpenseRowData {
  id: string;
  description: string;
  amount: number;
  expenseDate: string | Date;
  paidBy?: { id: string; name: string } | null;
  deductFromCustody: boolean;
  isReimbursed: boolean;
}

export function PaginatedProjectExpensesTable({
  expenses,
  projectId,
  lang,
}: {
  expenses: ProjectExpenseRowData[];
  projectId: string;
  lang: Lang;
}) {
  const td = dict[lang].projectDetail;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const totalPages = Math.ceil(expenses.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return expenses.slice(start, start + PAGE_SIZE);
  }, [expenses, page]);

  return (
    <div className="space-y-3">
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
          {paginated.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{formatDate(e.expenseDate, lang)}</TableCell>
              <TableCell>{e.description}</TableCell>
              <TableCell>{e.paidBy?.name ?? td.clientPaid}</TableCell>
              <TableCell className="text-end font-medium font-mono">
                {formatEGP(e.amount, lang)}
              </TableCell>
              <TableCell>
                {!e.paidBy ? (
                  <Badge variant="secondary">{td.clientPaid}</Badge>
                ) : e.deductFromCustody ? (
                  <Badge
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Wallet className="h-3 w-3" />
                    {td.deductedFromCustodyBadge}
                  </Badge>
                ) : (
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant={e.isReimbursed ? "success" : "warning"}>
                      {e.isReimbursed ? td.reimbursed : td.pending}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px] gap-1"
                    >
                      <AlertCircle className="h-2.5 w-2.5" />
                      {td.outOfPocketBadge}
                    </Badge>
                  </div>
                )}
              </TableCell>
              <TableCell className="text-end">
                <div className="flex items-center justify-end gap-1">
                  {e.paidBy && !e.deductFromCustody && (
                    <ReimburseButton
                      expenseId={e.id}
                      isReimbursed={e.isReimbursed}
                      lang={lang}
                    />
                  )}
                  <DeleteExpenseButton id={e.id} projectId={projectId} lang={lang} />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                {td.noExpenses}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={expenses.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "مصروف" : "expenses"}
      />
    </div>
  );
}
