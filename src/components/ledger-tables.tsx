"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatEGP, formatPct, type Lang } from "@/lib/format";
import { dict } from "@/lib/dict";
import { Pagination } from "@/components/ui/pagination";
import { DeleteDrawingButton } from "@/components/forms/transaction-forms";
import {
  Building2,
  ExternalLink,
  FolderGit2,
  Lightbulb,
} from "lucide-react";

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

/* -------------------- Partner Projects & Financial Breakdown Dialog -------------------- */

export interface PartnerProjectItem {
  projectId: string;
  projectName?: string;
  status?: string;
  sharePercentage: number;
  pendingReimbursement: number;
  profitShare: number;
  totalOwed: number;
}

export interface PartnerCompanyItem {
  expenseId: string;
  title?: string;
  share: number;
  paid: number;
  payout: number;
  net: number;
}

export function PartnerProjectsBreakdownDialog({
  partnerName,
  balance,
  pendingReimbursements,
  realizedProfitShare,
  companyNet,
  totalDrawings,
  breakdown,
  companyBreakdown,
  lang,
}: {
  partnerName: string;
  balance: number;
  pendingReimbursements: number;
  realizedProfitShare: number;
  companyNet: number;
  totalDrawings: number;
  breakdown: PartnerProjectItem[];
  companyBreakdown: PartnerCompanyItem[];
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const isAr = lang === "ar";

  // Calculate project totals
  const totalProjectProfit = breakdown.reduce((acc, b) => acc + b.profitShare, 0);
  const totalProjectPending = breakdown.reduce((acc, b) => acc + b.pendingReimbursement, 0);
  const totalProjectAmount = breakdown.reduce((acc, b) => acc + b.totalOwed, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 gap-1.5 text-xs font-semibold rounded-xl border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-primary h-8 transition-colors"
        >
          <FolderGit2 className="h-3.5 w-3.5" />
          <span>{isAr ? "تفاصيل ومشاريع الشريك" : "View Projects Breakdown"}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        dir={isAr ? "rtl" : "ltr"}
        className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-full max-h-screen flex flex-col p-0 border-s border-border shadow-2xl"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isAr ? `كشف حساب ومشاريع: ${partnerName}` : `Projects & Account: ${partnerName}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isAr
                  ? "تفصيل مصادر أموال الشريك والمشاريع القادمة منها ورصيد مصاريف الشركة"
                  : "Detailed breakdown of partner earnings, projects, and company overhead"}
              </DialogDescription>
            </div>
          </div>
          <DialogCloseButton />
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

        {/* Current Balance Banner */}
        <div
          className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
            balance < 0
              ? "border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30"
              : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          }`}
        >
          <div>
            <span className="text-xs text-muted-foreground block font-medium">
              {isAr ? "الرصيد النهائي الحالي" : "Current Net Balance"}
            </span>
            <span
              className={`text-xl font-bold font-mono ${
                balance < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {formatEGP(balance, lang)}
            </span>
          </div>
          <Badge
            variant={balance < 0 ? "destructive" : "success"}
            className="text-xs px-2.5 py-1 font-semibold"
          >
            {balance < 0
              ? isAr ? "مدين للشركة/الشركاء" : "Owes Firm"
              : isAr ? "مستحق للشريك" : "Owed to Partner"}
          </Badge>
        </div>

        {/* 4 Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-1">
            <span className="text-[11px] text-muted-foreground block truncate">
              {isAr ? "حصص الأرباح" : "Profit Shares"}
            </span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
              {formatEGP(realizedProfitShare, lang)}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-1">
            <span className="text-[11px] text-muted-foreground block truncate">
              {isAr ? "معلق من الجيب" : "Pending Reimb."}
            </span>
            <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 block">
              {formatEGP(pendingReimbursements, lang)}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-1">
            <span className="text-[11px] text-muted-foreground block truncate">
              {isAr ? "رصيد مصاريف الشركة" : "Overhead Net"}
            </span>
            <span
              className={`text-sm font-bold font-mono block ${
                companyNet < 0
                  ? "text-red-600 dark:text-red-400"
                  : companyNet > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
              }`}
            >
              {formatEGP(companyNet, lang)}
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 space-y-1">
            <span className="text-[11px] text-muted-foreground block truncate">
              {isAr ? "المستلم بالتسويات" : "Settled Cash"}
            </span>
            <span className="text-sm font-bold font-mono text-foreground block">
              {formatEGP(totalDrawings, lang)}
            </span>
          </div>
        </div>

        {/* Section 1: Projects Breakdown (From which projects is money coming?) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">
                {isAr ? "📂 تفاصيل أموال ومصادر المشاريع" : "📂 Projects Breakdown"}
              </h4>
            </div>
            {breakdown.length > 0 && (
              <span className="text-xs font-mono text-muted-foreground">
                {isAr ? `إجمالي المشاريع: ${formatEGP(totalProjectAmount, lang)}` : `Total: ${formatEGP(totalProjectAmount, lang)}`}
              </span>
            )}
          </div>

          {breakdown.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{isAr ? "المشروع" : "Project"}</TableHead>
                    <TableHead className="text-center">{isAr ? "النسبة" : "Share %"}</TableHead>
                    <TableHead className="text-end">{isAr ? "حصة الربح" : "Profit"}</TableHead>
                    <TableHead className="text-end">{isAr ? "مدفوع من الجيب" : "Reimb."}</TableHead>
                    <TableHead className="text-end font-semibold">{isAr ? "الإجمالي" : "Total"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((b) => (
                    <TableRow key={b.projectId}>
                      <TableCell className="font-medium">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/projects/${b.projectId}`}
                            className="text-primary hover:underline flex items-center gap-1 group"
                          >
                            <span className="truncate max-w-[130px] sm:max-w-[170px]">
                              {b.projectName ?? b.projectId.slice(0, 8)}
                            </span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                          {b.status && (
                            <Badge
                              variant={b.status === "COMPLETED" ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0 h-4 font-normal"
                            >
                              {b.status === "COMPLETED"
                                ? isAr
                                  ? "مكتمل"
                                  : "Completed"
                                : isAr
                                  ? "قيد التنفيذ"
                                  : "Active"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">
                        {formatPct(b.sharePercentage)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-emerald-600 dark:text-emerald-400">
                        {b.profitShare > 0 ? (
                          formatEGP(b.profitShare, lang)
                        ) : b.status && b.status !== "COMPLETED" ? (
                          <span className="text-[11px] text-muted-foreground font-sans">
                            {isAr ? "عند الاكتمال" : "Pending completion"}
                          </span>
                        ) : (
                          formatEGP(0, lang)
                        )}
                      </TableCell>
                      <TableCell className="text-end font-mono text-amber-600 dark:text-amber-400">
                        {b.pendingReimbursement > 0 ? formatEGP(b.pendingReimbursement, lang) : "—"}
                      </TableCell>
                      <TableCell className="text-end font-mono font-bold">
                        {formatEGP(b.totalOwed, lang)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {isAr ? "لا توجد مشاريع مسجلة لهذا الشريك حتى الآن." : "No projects recorded for this partner yet."}
            </div>
          )}
        </div>

        {/* Section 2: Company Overhead Breakdown */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground">
                {isAr ? "تفاصيل رصيد مصاريف الشركة (المقر والتشغيل)" : "Company Overhead Details"}
              </h4>
            </div>
            {companyBreakdown.length > 0 && (
              <span className={`text-xs font-mono font-semibold ${companyNet < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {isAr ? `الصافي: ${formatEGP(companyNet, lang)}` : `Net: ${formatEGP(companyNet, lang)}`}
              </span>
            )}
          </div>

          {companyBreakdown.length > 0 ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>{isAr ? "البند / الفاتورة" : "Expense"}</TableHead>
                    <TableHead className="text-end">{isAr ? "الحصة المطلوبة" : "Share"}</TableHead>
                    <TableHead className="text-end">{isAr ? "المدفوع" : "Paid"}</TableHead>
                    <TableHead className="text-end">{isAr ? "المسترد" : "Refunded"}</TableHead>
                    <TableHead className="text-end font-semibold">{isAr ? "الصافي" : "Net"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyBreakdown.map((c, i) => (
                    <TableRow key={c.expenseId || `${c.title}-${i}`}>
                      <TableCell className="font-medium">
                        {c.title ?? c.expenseId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs">
                        {formatEGP(c.share, lang)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs text-emerald-600">
                        {c.paid > 0 ? formatEGP(c.paid, lang) : "0.00 ج.م"}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs text-muted-foreground">
                        {c.payout > 0 ? formatEGP(c.payout, lang) : "—"}
                      </TableCell>
                      <TableCell className="text-end font-mono font-semibold">
                        <Badge
                          variant={c.net > 0 ? "success" : c.net < 0 ? "destructive" : "secondary"}
                          className="text-[11px] font-mono px-2 py-0.2"
                        >
                          {formatEGP(c.net, lang)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
              {isAr ? "لا توجد مساهمات في مصاريف عامة مسجلة بعد." : "No company expenses recorded yet."}
            </div>
          )}
        </div>

        <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
          <Lightbulb className="h-3.5 w-3.5 mt-px shrink-0 text-muted-foreground" aria-hidden />
          <span>
          {isAr
            ? "أرباح المشاريع تُسلَّم للشريك فور تسوية كل مشروع بدون احتجاز كوديعة في الشركة. «رصيد مصاريف الشركة» يوضح ما دفعه الشريك زيادة عن حصته (دائن) أو ما يتبقى عليه سداده لتغطية المصاريف المشتركة (مدين)."
            : "Project profits are handed directly to partners upon project settlement. Company overhead shows if the partner has overpaid (credit) or underpaid (debit) for shared operating expenses."}
          </span>
        </p>
      </DialogBody>

      <DialogFooter className="shrink-0 border-t border-border/60 px-5 py-3 bg-muted/20 flex justify-between items-center">
        <span className="text-[11px] text-muted-foreground font-mono">
          {isAr ? `الشريك: ${partnerName}` : `Partner: ${partnerName}`}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold rounded-lg h-8 px-4"
        >
          {isAr ? "إغلاق" : "Close"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
}
