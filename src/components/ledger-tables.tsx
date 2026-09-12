"use client";

import { useMemo, useState } from "react";
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
import { DeleteDrawingButton } from "@/components/forms/transaction-forms";

/* -------------------- Paginated Pending Expenses Table -------------------- */

export interface PendingExpenseRow {
  id: string;
  amount: number;
  project?: { name: string } | null;
  paidBy?: { name: string } | null;
}

export function PaginatedPendingExpensesTable({
  expenses,
  lang,
}: {
  expenses: PendingExpenseRow[];
  lang: Lang;
}) {
  const t = dict[lang].ledger;
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
            <TableHead>{t.colProject}</TableHead>
            <TableHead>{t.colPartner}</TableHead>
            <TableHead className="text-end">{t.colAmount}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-medium">{e.project?.name ?? "—"}</TableCell>
              <TableCell>{e.paidBy?.name ?? "—"}</TableCell>
              <TableCell className="text-end font-mono">
                {formatEGP(e.amount, lang)}
              </TableCell>
            </TableRow>
          ))}
          {expenses.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                {t.allSettled}
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
        itemLabel={lang === "ar" ? "مصروف معلق" : "pending expenses"}
      />
    </div>
  );
}

/* -------------------- Paginated Partner Drawings Table -------------------- */

export interface DrawingRow {
  id: string;
  amount: number;
  drawnAt: string | Date;
  notes?: string | null;
  partner: { name: string };
}

export function PaginatedDrawingsTable({
  drawings,
  lang,
}: {
  drawings: DrawingRow[];
  lang: Lang;
}) {
  const t = dict[lang].ledger;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const totalPages = Math.ceil(drawings.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return drawings.slice(start, start + PAGE_SIZE);
  }, [drawings, page]);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.colDate}</TableHead>
            <TableHead>{t.colPartner}</TableHead>
            <TableHead>{t.colNotes}</TableHead>
            <TableHead className="text-end">{t.colAmount}</TableHead>
            <TableHead className="text-end">{t.colAction}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((d) => (
            <TableRow key={d.id}>
              <TableCell>{formatDate(d.drawnAt, lang)}</TableCell>
              <TableCell className="font-medium">{d.partner.name}</TableCell>
              <TableCell className="text-muted-foreground">{d.notes ?? "—"}</TableCell>
              <TableCell className="text-end font-mono">
                {formatEGP(d.amount, lang)}
              </TableCell>
              <TableCell className="text-end">
                <DeleteDrawingButton id={d.id} lang={lang} />
              </TableCell>
            </TableRow>
          ))}
          {drawings.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                {t.noDrawings}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={drawings.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "مسحوبة" : "drawings"}
      />
    </div>
  );
}
