"use client";

import { useEffect, useMemo, useState } from "react";
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
import { formatDate, formatEGP, formatMonth, formatPct, Lang } from "@/lib/format";
import { dict } from "@/lib/dict";
import type { CompanyExpenseSettlement } from "@/lib/ledger";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Receipt,
  RotateCcw,
  Sparkles,
  Vault,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  CompanyPaymentForm,
  DeleteCompanyExpenseButton,
  DeleteCompanyPaymentButton,
  DisburseVaultExpenseButton,
  EditCompanyExpenseDialog,
  EditCompanyPaymentButton,
  RevertVaultExpenseButton,
  SettleBillButton,
  SettleRowButton,
} from "@/components/forms/company-forms";

export interface CompanyExpenseItemData {
  expense: {
    id: string;
    title: string;
    amount: number;
    notes: string | null;
    kind: "FIXED" | "VARIABLE";
    expenseDate: string | Date;
    billingMonth: string | null;
    vaultAmount: number;
    vaultDisbursed: boolean;
    vaultDisbursedAt: string | Date | null;
    vaultNotes: string | null;
    payments: {
      id: string;
      partnerId: string;
      amount: number;
      partner: { id: string; name: string };
    }[];
  };
  settlement: CompanyExpenseSettlement;
}

interface CompanyExpensesListProps {
  items: CompanyExpenseItemData[];
  partners: { id: string; name: string }[];
  lang: Lang;
}

export function CompanyExpensesList({
  items,
  partners,
  lang,
}: CompanyExpensesListProps) {
  const t = dict[lang].company;

  // 1. Kind filter: DEFAULT IS FIXED ("المصاريف الثابتة")
  const [kindFilter, setKindFilter] = useState<"VARIABLE" | "FIXED" | "ALL">("FIXED");

  // 2. Month filter: DEFAULT IS ALL TIME ("ALL")
  const [monthFilter, setMonthFilter] = useState<string>("ALL");

  // Helper to extract YYYY-MM from an expense
  const getExpenseMonth = (e: CompanyExpenseItemData["expense"]) => {
    if (e.billingMonth && e.billingMonth.includes("-")) {
      return e.billingMonth;
    }
    const d = new Date(e.expenseDate);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  // Extract all unique months from all expenses
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    items.forEach((item) => {
      const ym = getExpenseMonth(item.expense);
      if (ym) months.add(ym);
    });
    return Array.from(months).sort().reverse();
  }, [items]);

  // Total counts by kind across all items
  const variableCount = items.filter((it) => it.expense.kind !== "FIXED").length;
  const fixedCount = items.filter((it) => it.expense.kind === "FIXED").length;
  const totalCount = items.length;

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(({ expense }) => {
      // Kind filtering
      if (kindFilter === "VARIABLE" && expense.kind === "FIXED") return false;
      if (kindFilter === "FIXED" && expense.kind !== "FIXED") return false;

      // Month filtering
      if (monthFilter !== "ALL") {
        const ym = getExpenseMonth(expense);
        if (ym !== monthFilter) return false;
      }

      return true;
    });
  }, [items, kindFilter, monthFilter]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;

  useEffect(() => {
    setPage(1);
  }, [kindFilter, monthFilter]);

  // Filtered total amount
  const filteredTotal = useMemo(() => {
    return filteredItems.reduce((acc, it) => acc + it.expense.amount, 0);
  }, [filteredItems]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  const isDefaultFilter = kindFilter === "FIXED" && monthFilter === "ALL";

  return (
    <div className="space-y-4 min-w-0">
      {/* -------------------- Interactive Filter Bar -------------------- */}
      <div className="rounded-xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Kind Filter Tabs / Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={() => setKindFilter("FIXED")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                kindFilter === "FIXED"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-indigo-500" />
              <span>{lang === "ar" ? "المصاريف الثابتة" : "Fixed Costs"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  kindFilter === "FIXED"
                    ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {fixedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setKindFilter("VARIABLE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                kindFilter === "VARIABLE"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{lang === "ar" ? "المصاريف المتغيرة" : "Variable Expenses"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  kindFilter === "VARIABLE"
                    ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {variableCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setKindFilter("ALL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                kindFilter === "ALL"
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>{lang === "ar" ? "الكل" : "All Expenses"}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  kindFilter === "ALL"
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {totalCount}
              </span>
            </button>
          </div>

          {/* Month / Time Filter Dropdown */}
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Calendar className="absolute start-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={monthFilter}
                aria-label={lang === "ar" ? "تصفية حسب الشهر" : "Filter by month"}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="ps-9 pe-8 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
              >
                <option value="ALL">{lang === "ar" ? "كل الأوقات" : "All Time"}</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonth(ym, lang)}
                  </option>
                ))}
              </select>
            </div>

            {!isDefaultFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKindFilter("FIXED");
                  setMonthFilter("ALL");
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                title={lang === "ar" ? "إعادة تعيين للوضع الافتراضي (الثابتة - كل الأوقات)" : "Reset to default"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{lang === "ar" ? "افتراضي" : "Reset"}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Status Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>
              {lang === "ar"
                ? `عرض ${filteredItems.length} من أصل ${totalCount} مصروف`
                : `Showing ${filteredItems.length} of ${totalCount} expenses`}
            </span>
            {monthFilter !== "ALL" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {formatMonth(monthFilter, lang)}
              </Badge>
            )}
          </div>

          <div>
            <span>{lang === "ar" ? "إجمالي المعروض:" : "Total Filtered:"} </span>
            <strong className="font-mono text-foreground font-semibold">
              {formatEGP(filteredTotal, lang)}
            </strong>
          </div>
        </div>
      </div>

      {/* -------------------- Expense Cards -------------------- */}
      {paginatedItems.map((item) => (
        <CompanyExpenseCard
          key={item.settlement.expenseId}
          item={item}
          partners={partners}
          lang={lang}
          t={t}
        />
      ))}


      {filteredItems.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={filteredItems.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          lang={lang}
          itemLabel={lang === "ar" ? "مصروف" : "expenses"}
        />
      )}

      {/* Empty State when no items match filters */}
      {filteredItems.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Filter className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">
                {kindFilter === "VARIABLE"
                  ? lang === "ar"
                    ? "لا توجد مصاريف متغيرة"
                    : "No variable expenses found"
                  : kindFilter === "FIXED"
                    ? lang === "ar"
                      ? "لا توجد مصاريف ثابتة"
                      : "No fixed costs found"
                    : lang === "ar"
                      ? "لا توجد مصاريف مسجلة"
                      : "No expenses recorded"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {monthFilter !== "ALL"
                  ? lang === "ar"
                    ? `لم يتم العثور على بنود مطابقة لشهر ${formatMonth(monthFilter, lang)}.`
                    : `No matching items found for ${formatMonth(monthFilter, lang)}.`
                  : lang === "ar"
                    ? "يمكنك تسجيل مصروف جديد أو تغيير خيارات التصفية بالأعلى."
                    : "You can record a new expense or change your filter selection above."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {monthFilter !== "ALL" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthFilter("ALL")}
                  className="text-xs"
                >
                  {lang === "ar" ? "عرض كل الأوقات" : "Show all time"}
                </Button>
              )}
              {kindFilter !== "ALL" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setKindFilter("ALL")}
                  className="text-xs"
                >
                  {lang === "ar" ? "عرض جميع المصاريف (الكل)" : "Show all expenses"}
                </Button>
              )}
              {kindFilter === "FIXED" && variableCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setKindFilter("VARIABLE")}
                  className="text-xs"
                >
                  {lang === "ar"
                    ? `عرض المصاريف المتغيرة (${variableCount})`
                    : `Show variable expenses (${variableCount})`}
                </Button>
              )}
              {kindFilter === "VARIABLE" && fixedCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setKindFilter("FIXED")}
                  className="text-xs"
                >
                  {lang === "ar"
                    ? `عرض المصاريف الثابتة (${fixedCount})`
                    : `Show fixed costs (${fixedCount})`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -------------------- Collapsible Expense Card -------------------- */

interface CompanyExpenseCardProps {
  item: CompanyExpenseItemData;
  partners: { id: string; name: string }[];
  lang: Lang;
  t: (typeof dict)[Lang]["company"];
}

function CompanyExpenseCard({
  item,
  partners,
  lang,
  t,
}: CompanyExpenseCardProps) {
  const { expense, settlement: s } = item;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="min-w-0 overflow-hidden shadow-xs border-border/80 transition-all">
      <CardHeader
        className="cursor-pointer select-none p-4 sm:p-5 transition-colors hover:bg-muted/40"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base flex flex-wrap items-center gap-2">
              <span className="font-bold">{s.title ?? expense.title} · {formatEGP(s.amount, lang)}</span>
              <Badge variant="outline">
                {expense.kind === "FIXED"
                  ? dict[lang].summary.kindFixed
                  : dict[lang].summary.kindVariable}
              </Badge>
              {expense.billingMonth && (
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {lang === "ar" ? "استحقاق شهر:" : "Month:"}{" "}
                    <strong className="font-semibold">{formatMonth(expense.billingMonth, lang)}</strong>
                  </span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDate(expense.expenseDate, lang)} · {t.collected}{" "}
              {formatEGP(s.totalPaid, lang)} · {t.remaining}{" "}
              {formatEGP(s.remaining, lang)}
              {s.totalPayout > 0 && (
                <>
                  {" "}· {t.colPayout}: {formatEGP(s.totalPayout, lang)}
                </>
              )}
            </CardDescription>
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 sm:gap-2 flex-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <EditCompanyExpenseDialog
              expense={{
                id: expense.id,
                title: expense.title,
                amount: expense.amount,
                notes: expense.notes,
                expenseDate: expense.expenseDate,
                billingMonth: expense.billingMonth,
                vaultAmount: expense.vaultAmount,
                vaultNotes: expense.vaultNotes,
                kind: expense.kind,
              }}
              lang={lang}
            />
            <SettleBillButton
              expenseId={s.expenseId}
              hasOutstanding={s.rows.some((r) => Math.abs(r.net) >= 0.005)}
              lang={lang}
            />
            <DeleteCompanyExpenseButton id={s.expenseId} lang={lang} />
            <Button
              type="button"
              variant={isExpanded ? "ghost" : "outline"}
              size="sm"
              className="gap-1 rounded-lg h-8 text-xs font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>{lang === "ar" ? "طي" : "Collapse"}</span>
                </>
              ) : (
                <>
                  <span>{lang === "ar" ? "تفاصيل وسداد" : "Details"}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <div className="border-t border-border/60 animate-rise">
          {/* Vault reserve banner */}
          {expense.vaultAmount > 0 && (
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div
                className={`rounded-xl border p-3 text-xs space-y-2 ${
                  expense.vaultDisbursed
                    ? "border-border/80 bg-muted/30 text-muted-foreground"
                    : "border-indigo-200/80 bg-indigo-50/60 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
                      <Vault className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold">
                      {lang === "ar" ? "خزنة الشركة (الاحتياطي):" : "Company Vault:"}
                    </span>
                    <span className="font-mono font-bold text-sm text-indigo-700 dark:text-indigo-300">
                      {formatEGP(expense.vaultAmount, lang)}
                    </span>
                    {expense.vaultDisbursed ? (
                      <Badge variant="secondary" className="text-[11px] gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        <span>
                          {lang === "ar"
                            ? `تم الصرف وسداده ${expense.vaultDisbursedAt ? `(${formatDate(expense.vaultDisbursedAt, lang)})` : ""}`
                            : "Disbursed & settled from vault"}
                        </span>
                      </Badge>
                    ) : (
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]">
                        {lang === "ar" ? "محجوز بالخزنة حتى موعد السداد" : "Held in Vault until due"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {!expense.vaultDisbursed ? (
                      <DisburseVaultExpenseButton
                        expenseId={s.expenseId}
                        amount={expense.vaultAmount}
                        lang={lang}
                      />
                    ) : (
                      <RevertVaultExpenseButton expenseId={s.expenseId} lang={lang} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                  <span>
                    {lang === "ar" ? "المسدد فوراً للجهات:" : "Paid out immediately:"}{" "}
                    <strong className="text-foreground font-mono">
                      {formatEGP(
                        Math.max(0, expense.amount - expense.vaultAmount),
                        lang,
                      )}
                    </strong>
                  </span>
                  {expense.vaultNotes && (
                    <span>
                      {lang === "ar" ? "ملاحظة الخزنة:" : "Vault note:"}{" "}
                      <span className="text-foreground font-medium">{expense.vaultNotes}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <CardContent className="space-y-4 min-w-0 p-4 sm:p-6 pt-4">
            {/* Mobile settlement cards */}
            <div className="space-y-2.5 sm:hidden">
              {s.rows.map((r) => (
                <div
                  key={r.partnerId}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {r.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <span className="font-semibold block">{r.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatPct(r.sharePercentage)} ({formatEGP(r.shareAmount, lang)})
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={
                        r.net > 0
                          ? "success"
                          : r.net < 0
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {formatEGP(r.net, lang)}{" "}
                      {r.net > 0 ? t.overpaid : r.net < 0 ? t.owes : t.settled}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                    <div>
                      <span>{t.colPaid}: </span>
                      <strong className="text-foreground font-mono">{formatEGP(r.paid, lang)}</strong>
                      {r.payout > 0 && (
                        <span className="ms-2">({t.colPayout}: {formatEGP(r.payout, lang)})</span>
                      )}
                    </div>
                    <SettleRowButton
                      expenseId={s.expenseId}
                      partnerId={r.partnerId}
                      net={r.net}
                      lang={lang}
                    />
                  </div>
                </div>
              ))}
              {s.rows.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  {t.noExpenses}
                </p>
              )}
            </div>

            {/* Desktop / tablet table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.colPartner}</TableHead>
                    <TableHead className="text-end">{t.colShare}</TableHead>
                    <TableHead className="text-end">{t.colShareAmount}</TableHead>
                    <TableHead className="text-end">{t.colPaid}</TableHead>
                    <TableHead className="text-end">{t.colPayout}</TableHead>
                    <TableHead className="text-end">{t.colNet}</TableHead>
                    <TableHead className="text-end">{t.colSettle}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.rows.map((r) => (
                    <TableRow key={r.partnerId}>
                      <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {formatPct(r.sharePercentage)}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {formatEGP(r.shareAmount, lang)}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {formatEGP(r.paid, lang)}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        {r.payout > 0 ? (
                          formatEGP(r.payout, lang)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        <Badge
                          variant={
                            r.net > 0
                              ? "success"
                              : r.net < 0
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {formatEGP(r.net, lang)}{" "}
                          {r.net > 0 ? t.overpaid : r.net < 0 ? t.owes : t.settled}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-end whitespace-nowrap">
                        <SettleRowButton
                          expenseId={s.expenseId}
                          partnerId={r.partnerId}
                          net={r.net}
                          lang={lang}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {s.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {t.noExpenses}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Bottom payment input and history */}
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div>
                <p className="mb-2 text-sm font-medium">{t.payTitle}</p>
                <CompanyPaymentForm
                  expenseId={s.expenseId}
                  lang={lang}
                  partners={partners.map((p) => ({ id: p.id, name: p.name }))}
                />
              </div>
              <div className="space-y-2">
                {expense.payments.map((pay) => (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {pay.partner.name} · {formatEGP(pay.amount, lang)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <EditCompanyPaymentButton
                        paymentId={pay.id}
                        partnerName={pay.partner.name}
                        currentAmount={pay.amount}
                        lang={lang}
                      />
                      <DeleteCompanyPaymentButton id={pay.id} lang={lang} />
                    </div>
                  </div>
                ))}
                {expense.payments.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t.emptyPayments}</p>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      )}
    </Card>
  );
}
