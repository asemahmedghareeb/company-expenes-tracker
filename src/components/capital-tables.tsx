"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEGP, formatPct, type Lang } from "@/lib/format";
import { Pagination } from "@/components/ui/pagination";
import { DeleteSettlementButton } from "@/components/forms/settlement-dialog";

/* -------------------- Paginated Custody Inflows Table -------------------- */

export interface CustodyPaymentRow {
  paymentId: string;
  projectId: string;
  projectName: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  paidAt: string | Date;
  milestoneLabel?: string | null;
  notes?: string | null;
}

export function PaginatedCustodyPaymentsTable({
  payments,
  lang,
}: {
  payments: CustodyPaymentRow[];
  lang: Lang;
}) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.partnerName.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        (p.milestoneLabel && p.milestoneLabel.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)),
    );
  }, [payments, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return (
    <div className="space-y-3">
      {payments.length > 5 && (
        <div className="flex items-center justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={lang === "ar" ? "بحث باسم الشريك أو المشروع..." : "Search partner or project..."}
              className="h-8 ps-8 text-xs"
            />
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{lang === "ar" ? "الشريك الحائز للكاش" : "Holding Partner"}</TableHead>
            <TableHead>{lang === "ar" ? "المشروع التابع له" : "Project"}</TableHead>
            <TableHead>{lang === "ar" ? "بيان الدفعة / المرحلة" : "Milestone / Description"}</TableHead>
            <TableHead>{lang === "ar" ? "تاريخ الاستلام" : "Received Date"}</TableHead>
            <TableHead className="text-end">{lang === "ar" ? "المبلغ المحصل" : "Amount Received"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((pay) => (
            <TableRow key={pay.paymentId}>
              <TableCell className="font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                    {pay.partnerName.slice(0, 1)}
                  </div>
                  <span>{pay.partnerName}</span>
                </div>
              </TableCell>
              <TableCell>
                <Link
                  href={`/projects/${pay.projectId}`}
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                  <span>{pay.projectName}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs sm:text-sm">
                {pay.milestoneLabel || pay.notes || (lang === "ar" ? "دفعة من العميل" : "Client Payment")}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {formatDate(pay.paidAt, lang)}
              </TableCell>
              <TableCell className="text-end font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatEGP(pay.amount, lang)}
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                {lang === "ar" ? "لا توجد دفعات محصلة مسجلة أو مطابقة للبحث." : "No matching client payments recorded."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "دفعة كاش" : "cash payments"}
      />
    </div>
  );
}

/* -------------------- Paginated Executed Settlements -------------------- */

export interface ExecutedSettlementRow {
  id: string;
  title: string | null;
  notes: string | null;
  settledAt: string | Date;
  totalAmount: number;
  vaultAmount: number;
  vaultPercentage: number;
  project?: { id: string; name: string } | null;
  distributions: {
    id: string;
    amount: number;
    percentage: number;
    partner: { id: string; name: string };
  }[];
}

export function PaginatedExecutedSettlements({
  settlements,
  lang,
}: {
  settlements: ExecutedSettlementRow[];
  lang: Lang;
}) {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  const totalPages = Math.ceil(settlements.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return settlements.slice(start, start + PAGE_SIZE);
  }, [settlements, page]);

  if (settlements.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        {lang === "ar"
          ? "لم يتم تنفيذ أي تسويات أرباح حتى الآن. يمكنك تنفيذ تسوية من زر «تنفيذ تسوية وتوزيع الأرباح» بالأعلى."
          : "No profit settlements executed yet. Click 'Execute Settlement & Distribute Profits' above to record one."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paginated.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-border/80 bg-card p-4 space-y-3 transition-colors hover:border-border"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {s.title || (lang === "ar" ? "تسوية أرباح" : "Profit Settlement")}
                  </span>
                  {s.project && (
                    <Badge variant="secondary" className="text-xs">
                      {s.project.name}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    · {formatDate(s.settledAt, lang)}
                  </span>
                </div>
                {s.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-end">
                  <div className="text-xs text-muted-foreground">
                    {lang === "ar" ? "إجمالي المبلغ:" : "Total Settled:"}
                  </div>
                  <div className="font-mono font-bold text-sm">
                    {formatEGP(s.totalAmount, lang)}
                  </div>
                </div>
                <DeleteSettlementButton id={s.id} lang={lang} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-lg bg-indigo-50/60 p-2.5 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40">
                <div className="text-muted-foreground font-medium">
                  {lang === "ar" ? "مستقطع خزنة الشركة" : "Company Vault Cut"}
                </div>
                <div className="font-mono font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {formatEGP(s.vaultAmount, lang)}{" "}
                  <span className="font-normal text-[11px]">({s.vaultPercentage}%)</span>
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50/60 p-2.5 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/40 sm:col-span-2">
                <div className="text-muted-foreground font-medium mb-1">
                  {lang === "ar" ? "الموزع على الشركاء (سحب نقدي)" : "Distributed to Partners"}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.distributions.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1 text-xs border border-border/70 shadow-2xs"
                    >
                      <span className="font-medium text-foreground">{d.partner.name}:</span>
                      <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatEGP(d.amount, lang)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({formatPct(d.percentage)})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={settlements.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "تسوية" : "settlements"}
      />
    </div>
  );
}
