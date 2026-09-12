"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Vault, CheckCircle2, Pencil, Calendar, Plus, ChevronDown, ChevronUp, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addCompanyExpenseWithPayments,
  addFixedCost,
  deleteCompanyExpense,
  deleteCompanyPayment,
  deleteCompanyPayout,
  deleteFixedCost,
  disburseCompanyExpenseFromVault,
  recordCompanyPayment,
  recordCompanyPayout,
  recordCompanyPayoutBulk,
  revertCompanyExpenseVaultDisbursement,
  settleCompanyBill,
  settleCompanyRow,
  updateCompanyExpense,
  updateCompanyPayment,
} from "@/actions/company";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
import { formatEGP, formatMonth } from "@/lib/format";
import { formatShareInput, sanitizeNumericInput, splitMoney } from "@/lib/shares";

/* --------------------------- New expense form --------------------------- */

export function CompanyExpenseForm({
  lang,
  partners,
  fixedCosts,
}: {
  lang: Lang;
  partners: {
    id: string;
    name: string;
    defaultSharePercentage: number;
    isActive: boolean;
  }[];
  fixedCosts: { id: string; title: string; amount: number }[];
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [fixedIds, setFixedIds] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [billingMonth, setBillingMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  // Vault allocation state
  const [vaultAmount, setVaultAmount] = useState("");
  const [vaultNotes, setVaultNotes] = useState("");
  const [vaultItemIds, setVaultItemIds] = useState<string[]>([]);
  // Manually touched payer rows: { text }. Untouched rows derive live
  // from the bill amount × default equity (precise, not rounded).
  const [touched, setTouched] = useState<Record<string, string>>({});

  const active = partners.filter((p) => p.isActive);
  const bill = Number(amount) || 0;
  // Exact-split prefill (largest-remainder): parts sum to the bill,
  // so saving untouched rows never leaves 0.01 dust behind.
  const autoSplit = splitMoney(
    bill,
    active.map((p) => p.defaultSharePercentage),
  );
  const autoOf = (id: string) =>
    autoSplit[active.findIndex((p) => p.id === id)] ?? 0;
  const displayOf = (id: string) =>
    id in touched ? (touched[id] ?? "") : formatShareInput(autoOf(id));
  const valueOf = (id: string) =>
    id in touched ? Number(touched[id] ?? "") || 0 : autoOf(id);
  const collected = active.reduce((a, p) => a + valueOf(p.id), 0);
  const remaining = bill - collected;

  const pickedCosts = fixedCosts.filter((x) => fixedIds.includes(x.id));
  const vaultNum = Math.min(bill, Math.max(0, Number(vaultAmount) || 0));
  const directPaid = Math.max(0, bill - vaultNum);

  function fillShares() {
    setTouched({});
  }

  /** Toggle a fixed cost → snapshot combined title/total into this recording (editable after). */
  function applyFixedSelection(next: string[]) {
    setFixedIds(next);
    const picked = fixedCosts.filter((x) => next.includes(x.id));
    if (picked.length === 1) {
      setTitle(picked[0].title);
      setAmount(String(picked[0].amount));
      setTouched({});
    } else if (picked.length > 1) {
      setTitle(picked.map((x) => x.title).join(" + "));
      setAmount(String(picked.reduce((a, x) => a + x.amount, 0)));
      setTouched({});
    }
    const validVault = vaultItemIds.filter((id) => next.includes(id));
    setVaultItemIds(validVault);
    if (validVault.length > 0) {
      const sum = fixedCosts
        .filter((x) => validVault.includes(x.id))
        .reduce((a, x) => a + x.amount, 0);
      setVaultAmount(sum > 0 ? String(sum) : "");
    }
  }

  function toggleVaultItem(id: string) {
    const next = vaultItemIds.includes(id)
      ? vaultItemIds.filter((x) => x !== id)
      : [...vaultItemIds, id];
    setVaultItemIds(next);
    const sum = fixedCosts
      .filter((x) => next.includes(x.id))
      .reduce((a, x) => a + x.amount, 0);
    setVaultAmount(sum > 0 ? String(sum) : "");
  }

  function toggleFixed(id: string) {
    const next = fixedIds.includes(id)
      ? fixedIds.filter((x) => x !== id)
      : [...fixedIds, id];
    applyFixedSelection(next);
  }

  function clearFixed() {
    setFixedIds([]);
    setVaultItemIds([]);
    setVaultAmount("");
  }

  const pickedTotal = fixedCosts
    .filter((x) => fixedIds.includes(x.id))
    .reduce((a, x) => a + x.amount, 0);

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-xs transition-all">
      <CardHeader
        className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/40 sm:p-5"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PlusCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold text-foreground">
                {t.addTitle}
              </CardTitle>
              <CardDescription className="text-xs truncate">
                {t.addDesc}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant={isExpanded ? "ghost" : "default"}
            size="sm"
            className={cn(
              "shrink-0 gap-1.5 rounded-xl h-8.5 font-semibold text-xs",
              !isExpanded &&
                "bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-xs hover:from-indigo-500 hover:to-sky-500",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>{lang === "ar" ? "طي النموذج" : "Collapse"}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{lang === "ar" ? "تسجيل دفعة" : "Add Payment"}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="border-t border-border/60 p-4 sm:p-5 animate-rise">
          <form
            className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await addCompanyExpenseWithPayments({
            title,
            amount: bill,
            kind: fixedIds.length > 0 ? "FIXED" : "VARIABLE",
            notes: String(fd.get("notes") ?? ""),
            expenseDate: fd.get("expenseDate")
              ? new Date(String(fd.get("expenseDate")))
              : new Date(),
            billingMonth: billingMonth.trim() || undefined,
            vaultAmount: vaultNum,
            vaultNotes: vaultNotes.trim() || undefined,
            payments: active
              .map((p) => ({
                partnerId: p.id,
                amount: Math.round(valueOf(p.id) * 100) / 100,
              }))
              .filter((p) => p.amount > 0),
          });
          if (!res.ok) setError(res.error);
          else {
            (e.target as HTMLFormElement).reset();
            setFixedIds([]);
            setVaultItemIds([]);
            setVaultAmount("");
            setVaultNotes("");
            setBillingMonth(new Date().toISOString().slice(0, 7));
            setMenuOpen(false);
            setTitle("");
            setAmount("");
            setTouched({});
            setIsExpanded(false);
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-1">
        <Label>{t.chooseExpense}</Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-base sm:text-sm"
            aria-expanded={menuOpen}
          >
            <span className="truncate">
              {fixedIds.length === 0
                ? t.customOption
                : `${t.chosenCount(fixedIds.length)} · ${formatEGP(pickedTotal, lang)}`}
            </span>
            <span className="ms-2 shrink-0 text-muted-foreground">▾</span>
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-input bg-background p-1 shadow-lg">
                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={fixedIds.length === 0}
                    onChange={clearFixed}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="flex-1">{t.customOption}</span>
                </label>
                {fixedCosts.map((f) => (
                  <label
                    key={f.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={fixedIds.includes(f.id)}
                      onChange={() => toggleFixed(f.id)}
                      className="h-4 w-4 shrink-0"
                    />
                    <span className="flex-1 truncate">{f.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatEGP(f.amount, lang)}
                    </span>
                  </label>
                ))}
                {fixedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFixed}
                    className="mt-1 w-full rounded px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {t.clearSel}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.fTitle}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder={t.titlePh}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="10000"
          />
        </div>
        <div className="grid gap-1">
          <Label>{t.date}</Label>
          <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      <div className="grid gap-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            {lang === "ar" ? "شهر الاستحقاق / الدفعة تابعة لشهر" : "Billing Month"}
          </Label>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setBillingMonth(new Date().toISOString().slice(0, 7))}
              className="text-[11px] text-primary hover:underline"
            >
              {lang === "ar" ? "الشهر الحالي" : "Current"}
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                setBillingMonth(d.toISOString().slice(0, 7));
              }}
              className="text-[11px] text-primary hover:underline"
            >
              {lang === "ar" ? "الشهر القادم" : "Next"}
            </button>
          </div>
        </div>
        <Input
          type="month"
          value={billingMonth}
          onChange={(e) => setBillingMonth(e.target.value)}
          className="h-9 font-mono text-xs"
        />
        {billingMonth && (
          <span className="text-[11px] text-muted-foreground">
            {lang === "ar" ? "الدفعة مسجلة لشهر:" : "Linked to:"}{" "}
            <strong className="text-foreground font-semibold">
              {formatMonth(billingMonth, lang)}
            </strong>
          </span>
        )}
      </div>

      {/* Who paid how much — prefilled live with each share, editable */}
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t.payersTitle}</Label>
            <Button type="button" variant="outline" size="sm" onClick={fillShares}>
              {t.fillShares}
            </Button>
          </div>
          <div className="space-y-2">
            {active.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm font-semibold block">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground block">{p.defaultSharePercentage}%</span>
                  </div>
                </div>
                <div className="flex w-32 sm:w-36 shrink-0 items-center gap-1.5">
                  <Input
                    value={displayOf(p.id)}
                    onChange={(e) =>
                      setTouched((prev) => ({
                        ...prev,
                        [p.id]: sanitizeNumericInput(e.target.value),
                      }))
                    }
                    aria-label={p.name}
                    className="min-w-0 flex-1 text-end font-mono tabular-nums h-9"
                  />
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {lang === "ar" ? "ج.م" : "EGP"}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {bill > 0 && (
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.collected}</span>
                <span className="font-medium">{formatEGP(collected, lang)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.remaining}</span>
                {Math.abs(remaining) < 0.01 ? (
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {t.covered}
                  </span>
                ) : (
                  <span className="font-medium">{formatEGP(remaining, lang)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Route amount to Company Vault (Reserve) */}
      <div className="rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 to-indigo-100/20 p-3.5 dark:border-indigo-900/50 dark:from-indigo-950/20 dark:to-indigo-900/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-950 dark:text-indigo-200">
            <Vault className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              {lang === "ar"
                ? "توجيه جزء أو كامل المبلغ إلى خزنة الشركة (احتياطي)"
                : "Hold in Company Vault (Reserve)"}
            </span>
          </div>
          {vaultNum > 0 && (
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {formatEGP(vaultNum, lang)}
            </span>
          )}
        </div>

        {/* Multi-fixed cost quick selection badges */}
        {pickedCosts.length > 1 && (
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              {lang === "ar"
                ? "حدد البنود المحجوزة بالخزنة (مثال: الإيجار للشهر القادم والباقي يُسدد فوراً):"
                : "Select items to hold in vault (e.g. rent for next month):"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pickedCosts.map((item) => {
                const inVault = vaultItemIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleVaultItem(item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                      inVault
                        ? "border-indigo-500 bg-indigo-600 text-white font-medium shadow-xs"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.title}</span>
                    <span className="font-mono text-[11px] opacity-90">
                      ({formatEGP(item.amount, lang)})
                    </span>
                    <span className="font-bold">{inVault ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <div className="grid gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              {lang === "ar" ? "مبلغ الإيداع في الخزنة (ج.م)" : "Vault Deposit Amount (EGP)"}
            </label>
            <Input
              value={vaultAmount}
              onChange={(e) => {
                setVaultAmount(sanitizeNumericInput(e.target.value));
              }}
              placeholder={lang === "ar" ? "0 (مسدد فوراً بالكامل)" : "0 (all paid out)"}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              {lang === "ar" ? "ملاحظة الخزنة (اختياري)" : "Vault note (optional)"}
            </label>
            <Input
              value={vaultNotes}
              onChange={(e) => setVaultNotes(e.target.value)}
              placeholder={
                lang === "ar"
                  ? "مثال: إيجار محجوز حتى الشهر القادم"
                  : "e.g. held for next month rent"
              }
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-indigo-200/50 dark:border-indigo-900/40 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setVaultAmount("");
                setVaultItemIds([]);
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {lang === "ar" ? "سداد فوري كامل (0 بالخزنة)" : "Paid immediately (0)"}
            </button>
            <button
              type="button"
              onClick={() => {
                setVaultAmount(String(bill));
                setVaultItemIds(fixedIds);
              }}
              className="text-[11px] text-indigo-700 dark:text-indigo-400 hover:underline underline-offset-2 font-medium"
            >
              {lang === "ar" ? "إيداع كامل المبلغ بالخزنة" : "100% to vault"}
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-muted-foreground">
              {lang === "ar" ? "مسدد فوراً:" : "Paid out:"}{" "}
              <strong className="text-foreground">{formatEGP(directPaid, lang)}</strong>
            </span>
            <span className="text-indigo-700 dark:text-indigo-300">
              {lang === "ar" ? "بالخزنة:" : "In vault:"}{" "}
              <strong>{formatEGP(vaultNum, lang)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-1">
        <Label>{t.notes}</Label>
        <Textarea name="notes" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? t.saving : t.add}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsExpanded(false)}
        >
          {lang === "ar" ? "إلغاء" : "Cancel"}
        </Button>
      </div>
    </form>
        </CardContent>
      )}
    </Card>
  );
}

/* ---------------------------- Payment form ------------------------------ */

export function CompanyPaymentForm({
  expenseId,
  partners,
  lang,
}: {
  expenseId: string;
  partners: { id: string; name: string }[];
  lang: Lang;
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await recordCompanyPayment({
            expenseId,
            partnerId: String(fd.get("partnerId") ?? ""),
            amount: Number(amount) || 0,
          });
          if (!res.ok) setError(res.error);
          else {
            (e.target as HTMLFormElement).reset();
            setAmount("");
            router.refresh();
          }
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.colPartner}</Label>
          <select
            name="partnerId"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
          >
            <option value="">…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="5000"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.recording : t.record}
      </Button>
    </form>
  );
}

/* --------------------- One-click row settlement --------------------- */

/**
 * Settles one partner row on a bill to exactly zero.
 * Owes (net<0) → records a partner→firm payment. Owed (net>0) → records a
 * firm→partner payout.
 */
export function SettleRowButton({
  expenseId,
  partnerId,
  net,
  lang,
}: {
  expenseId: string;
  partnerId: string;
  net: number;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (Math.abs(net) < 0.005) return null;
  const collect = net < 0;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        title={`${collect ? t.settleCollect : t.settlePayout} · ${formatEGP(Math.abs(net), lang)}`}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await settleCompanyRow({ expenseId, partnerId });
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? t.settling : `${t.settle} · ${formatEGP(Math.abs(net), lang)}`}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

/* --------------------- One-click whole-bill settlement --------------------- */

/**
 * Settles EVERY row on a bill in one click: owing partners pay in,
 * overpaying partners get paid back — the bill ends fully settled.
 * Hidden when nothing is outstanding.
 */
export function SettleBillButton({
  expenseId,
  hasOutstanding,
  lang,
}: {
  expenseId: string;
  hasOutstanding: boolean;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hasOutstanding) return null;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await settleCompanyBill({ expenseId });
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? t.settling : t.settleAll}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

/* --------------------- Manual firm → partner payout --------------------- */

export function CompanyPayoutForm({
  lang,
  partners,
  expenses,
}: {
  lang: Lang;
  partners: { id: string; name: string }[];
  expenses: { id: string; title: string }[];
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [amount, setAmount] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  /** "company" = vault pays, "partner" = one or more partners pay directly */
  const [payerSource, setPayerSource] = useState<"company" | "partner">("company");
  /** Checked partner IDs (multi-select) */
  const [checkedPayers, setCheckedPayers] = useState<Set<string>>(new Set());
  /** Per-partner amount overrides (empty string = auto from split) */
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});

  const totalNum = Number(amount) || 0;
  const availablePayers = partners.filter((p) => p.id !== recipientId);
  const checkedList = availablePayers.filter((p) => checkedPayers.has(p.id));

  // Auto-split: distribute total equally, let user override per-row
  const getPayerAmount = (partnerId: string): number => {
    const override = payerAmounts[partnerId];
    if (override !== undefined && override !== "") return Number(override) || 0;
    if (checkedList.length === 0) return 0;
    return Math.round((totalNum / checkedList.length) * 100) / 100;
  };

  const totalAssigned = checkedList.reduce((s, p) => s + getPayerAmount(p.id), 0);
  const isBalanced = checkedList.length === 0 || Math.abs(totalAssigned - totalNum) < 0.02;

  function reset() {
    setAmount("");
    setRecipientId("");
    setExpenseId("");
    setNotes("");
    setDate(new Date().toISOString().slice(0, 10));
    setPayerSource("company");
    setCheckedPayers(new Set());
    setPayerAmounts({});
    setIsExpanded(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    start(async () => {
      let res: { ok: boolean; error?: string };

      if (payerSource === "company") {
        // Single company-funded payout
        const r = await recordCompanyPayout({
          partnerId: recipientId,
          expenseId,
          paidByPartnerId: "",
          amount: totalNum,
          notes,
          paidAt: new Date(date),
        });
        res = r;
      } else {
        // Multi-payer: use bulk action
        const r = await recordCompanyPayoutBulk({
          partnerId: recipientId,
          expenseId: expenseId || undefined,
          notes: notes || undefined,
          paidAt: new Date(date),
          payers: checkedList.map((p) => ({
            partnerId: p.id,
            amount: getPayerAmount(p.id),
          })),
        });
        res = r;
      }

      if (!res.ok) {
        setError(res.error ?? "حدث خطأ");
      } else {
        reset();
        router.refresh();
      }
    });
  }

  return (
    <Card className="min-w-0 overflow-hidden border-border/80 shadow-xs transition-all">
      <CardHeader
        className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/40 sm:p-5"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              🤝
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold text-foreground">
                {t.payoutTitle}
              </CardTitle>
              <CardDescription className="text-xs truncate">
                {t.payoutDesc}
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant={isExpanded ? "ghost" : "default"}
            size="sm"
            className={cn(
              "shrink-0 gap-1.5 rounded-xl h-8.5 font-semibold text-xs",
              !isExpanded &&
                "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-xs hover:from-amber-500 hover:to-orange-500",
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>{lang === "ar" ? "طي النموذج" : "Collapse"}</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>{lang === "ar" ? "رد مبلغ" : "Add Payout"}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="border-t border-border/60 p-4 sm:p-5 animate-rise">
          <form className="space-y-3" onSubmit={handleSubmit}>
            {/* Recipient + Bill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>{t.colPartner}</Label>
                <select
                  required
                  value={recipientId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setRecipientId(newId);
                    setCheckedPayers((prev) => {
                      const next = new Set(prev);
                      next.delete(newId);
                      return next;
                    });
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                >
                  <option value="">…</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label>{t.payoutBill}</Label>
                <select
                  value={expenseId}
                  onChange={(e) => setExpenseId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                >
                  <option value="">{t.payoutGeneral}</option>
                  {expenses.map((x) => (
                    <option key={x.id} value={x.id}>{x.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payer source toggle */}
            <div className="grid gap-1">
              <Label>{lang === "ar" ? "مصدر الدفع" : "Paid By"}</Label>
              <div className="flex rounded-md overflow-hidden border border-input text-sm">
                <button
                  type="button"
                  onClick={() => { setPayerSource("company"); setCheckedPayers(new Set()); setPayerAmounts({}); }}
                  className={cn(
                    "flex-1 px-3 py-1.5 font-medium transition-colors",
                    payerSource === "company"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  {lang === "ar" ? "🏢 الشركة (الخزينة)" : "🏢 Company Vault"}
                </button>
                <button
                  type="button"
                  onClick={() => setPayerSource("partner")}
                  className={cn(
                    "flex-1 px-3 py-1.5 font-medium transition-colors",
                    payerSource === "partner"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  {lang === "ar" ? "🤝 شريك (أو أكثر)" : "🤝 Partner(s)"}
                </button>
              </div>
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>{t.amount}</Label>
                <Input
                  value={amount}
                  onChange={(e) => {
                    setAmount(sanitizeNumericInput(e.target.value));
                    setPayerAmounts({}); // reset overrides when total changes
                  }}
                  required
                  placeholder="500"
                />
              </div>
              <div className="grid gap-1">
                <Label>{t.date}</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            {/* Multi-payer checkboxes (partner mode) */}
            {payerSource === "partner" && availablePayers.length > 0 && (
              <div className="space-y-2 animate-rise">
                <Label>{lang === "ar" ? "الشركاء الدافعون (اختر واحد أو أكثر)" : "Paying Partners (select one or more)"}</Label>
                <div className="rounded-lg border border-border divide-y divide-border/60">
                  {availablePayers.map((p) => {
                    const checked = checkedPayers.has(p.id);
                    const autoAmt = checked ? getPayerAmount(p.id) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-2.5">
                        <input
                          type="checkbox"
                          id={`payer-${p.id}`}
                          checked={checked}
                          onChange={(e) => {
                            setCheckedPayers((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(p.id);
                              else {
                                next.delete(p.id);
                                setPayerAmounts((pa) => { const n = { ...pa }; delete n[p.id]; return n; });
                              }
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        />
                        <label htmlFor={`payer-${p.id}`} className="flex-1 text-sm font-medium cursor-pointer select-none">
                          {p.name}
                        </label>
                        {checked && (
                          <div className="flex items-center gap-1.5">
                            <Input
                              className="w-24 h-7 text-xs text-right font-mono"
                              value={payerAmounts[p.id] ?? String(autoAmt)}
                              onChange={(e) =>
                                setPayerAmounts((pa) => ({
                                  ...pa,
                                  [p.id]: sanitizeNumericInput(e.target.value),
                                }))
                              }
                              placeholder="0"
                            />
                            <span className="text-xs text-muted-foreground">ج.م</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Balance indicator */}
                {checkedList.length > 0 && totalNum > 0 && (
                  <div className={cn(
                    "rounded-lg px-3 py-2 text-xs leading-relaxed",
                    isBalanced
                      ? "border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200"
                      : "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/60 text-red-700 dark:text-red-300",
                  )}>
                    {isBalanced
                      ? `✅ ${checkedList.map((p) => `${p.name}: ${formatEGP(getPayerAmount(p.id), lang)}`).join(" • ")} — ${lang === "ar" ? "المجموع متساوٍ" : "totals match"}`
                      : `⚠️ ${lang === "ar" ? `المبالغ المحددة ${formatEGP(totalAssigned, lang)} ≠ الإجمالي ${formatEGP(totalNum, lang)}` : `Assigned ${formatEGP(totalAssigned, lang)} ≠ total ${formatEGP(totalNum, lang)}`}`}
                  </div>
                )}
                {checkedList.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {lang === "ar" ? "☝️ اختر شريكاً دافعاً واحداً على الأقل" : "☝️ Select at least one paying partner"}
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-1">
              <Label>{t.notes}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={
                pending ||
                (payerSource === "partner" && (checkedList.length === 0 || !isBalanced))
              }
              className="w-full"
            >
              {pending ? t.saving : t.payoutAdd}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}



export function DeleteCompanyPayoutButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const { armed, setArmed, pending, error, confirm } = useConfirmDelete(() =>
    deleteCompanyPayout(id),
  );
  if (!armed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        title={t.delete}
        aria-label={t.delete}
        onClick={() => setArmed(true)}
        className="hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? t.deleting : t.deleteConfirm}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
          {t.cancel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ------------------------------ Delete flow ----------------------------- */

function useConfirmDelete(
  run: () => Promise<{ ok: boolean; error?: string }>,
) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await run();
      if (!res.ok) {
        setError(res.error ?? "Failed.");
        setArmed(false);
      } else {
        router.refresh();
      }
    });
  }

  return { armed, setArmed, pending, error, confirm };
}

export function DeleteCompanyExpenseButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const { armed, setArmed, pending, error, confirm } = useConfirmDelete(() =>
    deleteCompanyExpense(id),
  );
  if (!armed) {
    return (
      <Button size="sm" variant="destructive" onClick={() => setArmed(true)}>
        {t.delete}
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? t.deleting : t.deleteConfirm}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setArmed(false)}>
          {t.cancel}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function DeleteCompanyPaymentButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const { armed, setArmed, pending, error, confirm } = useConfirmDelete(() =>
    deleteCompanyPayment(id),
  );
  if (!armed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        title={t.delete}
        aria-label={t.delete}
        onClick={() => setArmed(true)}
        className="hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? t.deleting : t.deleteConfirm}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
          {t.cancel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ------------------------- Fixed cost registry -------------------------- */

export function FixedCostsManager({
  lang,
  fixedCosts,
}: {
  lang: Lang;
  fixedCosts: { id: string; title: string; amount: number }[];
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col sm:flex-row sm:items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const res = await addFixedCost({
              title,
              amount: Number(amount) || 0,
            });
            if (!res.ok) setError(res.error);
            else {
              setTitle("");
              setAmount("");
              router.refresh();
            }
          });
        }}
      >
        <div className="grid flex-1 gap-1">
          <Label>{t.fTitle}</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder={t.titlePh}
          />
        </div>
        <div className="grid grid-cols-1 sm:w-36 gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="10000"
          />
        </div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto shrink-0">
          {pending ? t.saving : t.fixedAdd}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {fixedCosts.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
          >
            <span className="font-medium">{f.title}</span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatEGP(f.amount, lang)}</span>
              <DeleteFixedCostButton id={f.id} lang={lang} />
            </span>
          </div>
        ))}
        {fixedCosts.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.noExpenses}</p>
        )}
      </div>
    </div>
  );
}

export function DeleteFixedCostButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const t = dict[lang].company;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteFixedCost(id);
      if (!res.ok) {
        setError(res.error);
        setArmed(false);
      } else {
        router.refresh();
      }
    });
  }

  if (!armed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        title={t.delete}
        aria-label={t.delete}
        onClick={() => setArmed(true)}
        className="hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? t.deleting : t.deleteConfirm}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
          {t.cancel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ------------------- Vault Disburse & Revert Buttons ------------------- */

export function DisburseVaultExpenseButton({
  expenseId,
  amount,
  lang,
}: {
  expenseId: string;
  amount: number;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        const msg =
          lang === "ar"
            ? `هل تريد تأكيد صرف مبلغ ${formatEGP(amount, lang)} المحجوز في الخزنة وسداده للمصروف؟ (سيتم خصمه من رصيد الخزنة)`
            : `Confirm disbursing ${formatEGP(amount, lang)} from the company vault to settle this expense?`;
        if (!confirm(msg)) return;
        start(async () => {
          const res = await disburseCompanyExpenseFromVault({ expenseId });
          if (!res.ok) alert(res.error);
          else router.refresh();
        });
      }}
      className="h-7 text-xs gap-1.5 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
    >
      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
      <span>{lang === "ar" ? "صرف وسداد من الخزنة" : "Disburse from Vault"}</span>
    </Button>
  );
}

export function RevertVaultExpenseButton({
  expenseId,
  lang,
}: {
  expenseId: string;
  lang: Lang;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const msg =
          lang === "ar"
            ? "هل تريد إلغاء الصرف وإعادة المبلغ إلى خزنة الشركة كاحتياطي محجوز؟"
            : "Revert disbursement and return funds back to the company vault reserve?";
        if (!confirm(msg)) return;
        start(async () => {
          const res = await revertCompanyExpenseVaultDisbursement(expenseId);
          if (!res.ok) alert(res.error);
          else router.refresh();
        });
      }}
      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
    >
      {lang === "ar" ? "إلغاء الصرف (إعادة للخزنة)" : "Undo Disburse"}
    </button>
  );
}

/* ------------------- Edit Company Expense Dialog ------------------- */

export function EditCompanyExpenseDialog({
  expense,
  lang,
}: {
  expense: {
    id: string;
    title: string;
    amount: number;
    notes?: string | null;
    expenseDate: string | Date;
    billingMonth?: string | null;
    vaultAmount?: number;
    vaultNotes?: string | null;
    kind: string;
  };
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [expenseDate, setExpenseDate] = useState(
    new Date(expense.expenseDate).toISOString().slice(0, 10),
  );
  const [billingMonth, setBillingMonth] = useState(expense.billingMonth || "");
  const [vaultAmount, setVaultAmount] = useState(
    expense.vaultAmount ? String(expense.vaultAmount) : "",
  );
  const [vaultNotes, setVaultNotes] = useState(expense.vaultNotes || "");
  const [notes, setNotes] = useState(expense.notes || "");
  const [kind, setKind] = useState<"FIXED" | "VARIABLE">(
    expense.kind === "FIXED" ? "FIXED" : "VARIABLE",
  );

  const bill = Number(amount) || 0;
  const vaultNum = Math.min(bill, Math.max(0, Number(vaultAmount) || 0));
  const directPaid = Math.max(0, bill - vaultNum);

  function resetToOriginal() {
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setExpenseDate(new Date(expense.expenseDate).toISOString().slice(0, 10));
    setBillingMonth(expense.billingMonth || "");
    setVaultAmount(expense.vaultAmount ? String(expense.vaultAmount) : "");
    setVaultNotes(expense.vaultNotes || "");
    setNotes(expense.notes || "");
    setKind(expense.kind === "FIXED" ? "FIXED" : "VARIABLE");
    setError(null);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          resetToOriginal();
          setOpen(true);
        }}
        className="h-8 gap-1.5 text-xs"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{lang === "ar" ? "تعديل الدفعة" : "Edit Bill"}</span>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) resetToOriginal();
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span>{lang === "ar" ? "تعديل تفاصيل الدفعة" : "Edit Bill Details"}</span>
            </DialogTitle>
            <DialogDescription>
              {lang === "ar"
                ? "تعديل اسم المصروف، إجمالي المبلغ، شهر الاستحقاق، وتخصيص الخزنة."
                : "Update bill title, amount, billing month, and vault allocation."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await updateCompanyExpense({
                  id: expense.id,
                  title: title.trim(),
                  amount: bill,
                  expenseDate: new Date(expenseDate),
                  billingMonth: billingMonth.trim() || null,
                  vaultAmount: vaultNum,
                  vaultNotes: vaultNotes.trim() || null,
                  notes: notes.trim() || null,
                  kind,
                });
                if (!res.ok) {
                  setError(res.error);
                } else {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
            className="space-y-3.5"
          >
            <DialogBody className="space-y-3">
              <div className="grid gap-1">
                <Label>{lang === "ar" ? "اسم / بيان الدفعة" : "Bill Title"}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1">
                  <Label>{lang === "ar" ? "إجمالي المبلغ (ج.م)" : "Amount (EGP)"}</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                    required
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-1">
                  <Label>{lang === "ar" ? "نوع المصروف" : "Kind"}</Label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "FIXED" | "VARIABLE")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="FIXED">{lang === "ar" ? "ثابت (شهري)" : "Fixed"}</option>
                    <option value="VARIABLE">{lang === "ar" ? "متغير" : "Variable"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1">
                  <Label>{lang === "ar" ? "تاريخ السداد الفعلي" : "Payment Date"}</Label>
                  <Input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <Label>{lang === "ar" ? "شهر الاستحقاق" : "Billing Month"}</Label>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        setBillingMonth(d.toISOString().slice(0, 7));
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      {lang === "ar" ? "+شهر" : "+1m"}
                    </button>
                  </div>
                  <Input
                    type="month"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              {billingMonth && (
                <div className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                  {lang === "ar" ? "الدفعة مرتبطة بشهر:" : "Linked to month:"}{" "}
                  <strong className="text-foreground">{formatMonth(billingMonth, lang)}</strong>
                </div>
              )}

              {/* Vault allocation in edit modal */}
              <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/40 p-2.5 dark:border-indigo-900/50 dark:bg-indigo-950/20 space-y-2 text-xs">
                <div className="flex items-center justify-between font-medium text-indigo-950 dark:text-indigo-200">
                  <span className="flex items-center gap-1.5">
                    <Vault className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{lang === "ar" ? "خزنة الشركة (الاحتياطي)" : "Company Vault"}</span>
                  </span>
                  {vaultNum > 0 && (
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatEGP(vaultNum, lang)}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <label className="text-[11px] text-muted-foreground">
                      {lang === "ar" ? "المبلغ بالخزنة (ج.م)" : "Vault Amount"}
                    </label>
                    <Input
                      value={vaultAmount}
                      onChange={(e) => setVaultAmount(sanitizeNumericInput(e.target.value))}
                      placeholder="0"
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[11px] text-muted-foreground">
                      {lang === "ar" ? "ملاحظة الخزنة" : "Vault Note"}
                    </label>
                    <Input
                      value={vaultNotes}
                      onChange={(e) => setVaultNotes(e.target.value)}
                      placeholder={lang === "ar" ? "مثال: إيجار للشهر القادم" : "e.g. rent"}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-indigo-200/40 dark:border-indigo-900/30 text-muted-foreground font-mono">
                  <span>{lang === "ar" ? "مسدد فوراً:" : "Paid:"} {formatEGP(directPaid, lang)}</span>
                  <span>{lang === "ar" ? "بالخزنة:" : "Vault:"} {formatEGP(vaultNum, lang)}</span>
                </div>
              </div>

              <div className="grid gap-1">
                <Label>{lang === "ar" ? "ملاحظات عامة" : "Notes"}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}
            </DialogBody>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending
                  ? (lang === "ar" ? "جاري الحفظ..." : "Saving...")
                  : (lang === "ar" ? "حفظ التعديلات" : "Save Changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------- Edit Company Payment Button ------------------- */

export function EditCompanyPaymentButton({
  paymentId,
  partnerName,
  currentAmount,
  lang,
}: {
  paymentId: string;
  partnerName: string;
  currentAmount: number;
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(currentAmount));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setAmount(String(currentAmount));
          setError(null);
          setOpen(true);
        }}
        title={lang === "ar" ? "تعديل دفعة الشريك" : "Edit payment"}
        className="h-7 w-7 p-0 hover:text-primary"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {lang === "ar" ? `تعديل دفعة: ${partnerName}` : `Edit payment: ${partnerName}`}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = Number(amount) || 0;
              if (num <= 0) {
                setError(
                  lang === "ar"
                    ? "المبلغ يجب أن يكون أكبر من صفر"
                    : "Amount must be > 0",
                );
                return;
              }
              start(async () => {
                const res = await updateCompanyPayment({
                  paymentId,
                  amount: num,
                });
                if (!res.ok) setError(res.error);
                else {
                  setOpen(false);
                  router.refresh();
                }
              });
            }}
            className="space-y-3"
          >
            <DialogBody className="space-y-2">
              <div className="grid gap-1">
                <Label>{lang === "ar" ? "المبلغ المدفوع (ج.م)" : "Amount (EGP)"}</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
                  required
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </DialogBody>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                {lang === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending
                  ? (lang === "ar" ? "حفظ..." : "Saving...")
                  : (lang === "ar" ? "حفظ" : "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


