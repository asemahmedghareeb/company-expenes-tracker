"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import {
  addCompanyExpenseWithPayments,
  addFixedCost,
  deleteCompanyExpense,
  deleteCompanyPayment,
  deleteCompanyPayout,
  deleteFixedCost,
  recordCompanyPayment,
  recordCompanyPayout,
  settleCompanyRow,
} from "@/actions/company";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
import { formatEGP } from "@/lib/format";
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
  const [fixedId, setFixedId] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
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

  function fillShares() {
    setTouched({});
  }

  /** Pick a fixed cost → snapshot its title/amount into this recording (editable after). */
  function pickFixed(id: string) {
    setFixedId(id);
    const f = fixedCosts.find((x) => x.id === id);
    if (f) {
      setTitle(f.title);
      setAmount(String(f.amount));
      setTouched({});
    }
  }

  return (
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
            kind: fixedId ? "FIXED" : "VARIABLE",
            notes: String(fd.get("notes") ?? ""),
            expenseDate: fd.get("expenseDate")
              ? new Date(String(fd.get("expenseDate")))
              : new Date(),
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
            setFixedId("");
            setTitle("");
            setAmount("");
            setTouched({});
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-1">
        <Label>{t.chooseExpense}</Label>
        <select
          value={fixedId}
          onChange={(e) => pickFixed(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t.customOption}</option>
          {fixedCosts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.title} · {formatEGP(f.amount, lang)}
            </option>
          ))}
        </select>
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
      <div className="grid grid-cols-2 gap-3">
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

      {/* Who paid how much — prefilled live with each share, editable */}
      {active.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t.payersTitle}</Label>
            <Button type="button" variant="outline" size="sm" onClick={fillShares}>
              {t.fillShares}
            </Button>
          </div>
          {active.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 truncate text-sm">{p.name}</span>
              <div className="flex w-36 shrink-0 items-center gap-1">
                <Input
                  value={displayOf(p.id)}
                  onChange={(e) =>
                    setTouched((prev) => ({
                      ...prev,
                      [p.id]: sanitizeNumericInput(e.target.value),
                    }))
                  }
                  aria-label={p.name}
                  className="min-w-0 flex-1 text-end"
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {lang === "ar" ? "ج.م" : "EGP"}
                </span>
              </div>
            </div>
          ))}
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

      <div className="grid gap-1">
        <Label>{t.notes}</Label>
        <Textarea name="notes" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.saving : t.add}
      </Button>
    </form>
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
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
  const [amount, setAmount] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await recordCompanyPayout({
            partnerId: String(fd.get("partnerId") ?? ""),
            expenseId: String(fd.get("expenseId") ?? ""),
            amount: Number(amount) || 0,
            notes: String(fd.get("notes") ?? ""),
            paidAt: fd.get("paidAt")
              ? new Date(String(fd.get("paidAt")))
              : new Date(),
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
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <Label>{t.payoutBill}</Label>
          <select
            name="expenseId"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t.payoutGeneral}</option>
            {expenses.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="500"
          />
        </div>
        <div className="grid gap-1">
          <Label>{t.date}</Label>
          <Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.notes}</Label>
        <Input name="notes" maxLength={1000} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.saving : t.payoutAdd}
      </Button>
    </form>
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
        className="flex items-end gap-2"
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
        <div className="grid w-32 shrink-0 gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="10000"
          />
        </div>
        <Button type="submit" disabled={pending}>
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

/* ------------------------- Quick variable form -------------------------- */
/* One-off overhead paid by a single partner (Facebook ads, …). */

export function QuickVariableForm({
  lang,
  partners,
}: {
  lang: Lang;
  partners: { id: string; name: string }[];
}) {
  const t = dict[lang].company;
  const te = dict[lang].expenseForm;
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
          const paidBy = String(fd.get("paidBy") ?? "");
          const res = await addCompanyExpenseWithPayments({
            title: String(fd.get("title") ?? ""),
            amount: Number(amount) || 0,
            kind: "VARIABLE",
            notes: String(fd.get("notes") ?? ""),
            expenseDate: fd.get("expenseDate")
              ? new Date(String(fd.get("expenseDate")))
              : new Date(),
            payments:
              paidBy !== ""
                ? [{ partnerId: paidBy, amount: Number(amount) || 0 }]
                : [],
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
      <div className="grid gap-1">
        <Label>{t.fTitle}</Label>
        <Input name="title" required maxLength={200} placeholder={t.titlePh} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            required
            placeholder="500"
          />
        </div>
        <div className="grid gap-1">
          <Label>{t.date}</Label>
          <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{te.paidBy}</Label>
          <select
            name="paidBy"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{te.selectPartner}</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{t.notes}</Label>
          <Input name="notes" maxLength={1000} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.saving : t.varAdd}
      </Button>
    </form>
  );
}
