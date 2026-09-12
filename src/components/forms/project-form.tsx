"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { EquityBar } from "@/components/projects/equity-bar";
import { FinancePill } from "@/components/projects/finance-pill";
import { createProject } from "@/actions/projects";
import { dict } from "@/lib/dict";
import { type Lang } from "@/lib/format";
import {
  equalSplit,
  normalizeShares,
  sanitizeNumericInput,
  sharesSumTo100,
  CLIENT_PAYER,
} from "@/lib/shares";

interface ExpenseRow {
  key: string;
  title: string;
  amount: string;
  paidBy: string;
}

function newKey() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ProjectForm({
  partners,
  lang,
  onSuccess,
}: {
  partners: { id: string; name: string; defaultSharePercentage: number }[];
  lang: Lang;
  onSuccess?: () => void;
}) {
  const t = dict[lang].projectForm;
  const tf = dict[lang].expenseForm;
  const tp = dict[lang].projectsPage;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SplitRow[]>(
    partners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      sharePercentage: p.defaultSharePercentage,
    })),
  );
  const [contractStr, setContractStr] = useState("");
  const [items, setItems] = useState<ExpenseRow[]>([]);

  // Focus target for the next created expense row (its description input).
  const pendingFocusKey = useRef<string | null>(null);
  const titleRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    const key = pendingFocusKey.current;
    if (!key) return;
    pendingFocusKey.current = null;
    titleRefs.current.get(key)?.focus();
  }, [items.length]);

  // ---- Real-time computations (react to every keystroke) ----
  // Client-covered rows never touch firm books: excluded from totals/profit.
  const contractValue = Number(contractStr) || 0;
  const totalExpenses = items.reduce(
    (a, it) => a + (it.paidBy === CLIENT_PAYER ? 0 : Number(it.amount) || 0),
    0,
  );
  const clientExpenses = items.reduce(
    (a, it) => a + (it.paidBy === CLIENT_PAYER ? Number(it.amount) || 0 : 0),
    0,
  );

  function addItem(focusNext = false) {
    const key = newKey();
    setItems((xs) => [
      ...xs,
      { key, title: "", amount: "", paidBy: partners[0]?.id ?? "" },
    ]);
    if (focusNext) pendingFocusKey.current = key;
  }

  function updateItem(key: string, patch: Partial<ExpenseRow>) {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function removeItem(key: string) {
    titleRefs.current.delete(key);
    setItems((xs) => xs.filter((x) => x.key !== key));
  }

  function fail(msg: string) {
    setError(msg);
    toast.error(msg);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
    if (!sharesSumTo100(rows.map((r) => r.sharePercentage))) {
      fail(t.splitsError(total.toFixed(2)));
      return;
    }
    // Drop fully-empty rows; the rest must be complete.
    const filled = items.filter(
      (it) => it.title.trim() !== "" || (Number(it.amount) || 0) > 0,
    );
    for (const r of filled) {
      if (r.title.trim() === "" || !(Number(r.amount) > 0) || !r.paidBy) {
        fail(t.expenseError);
        return;
      }
    }
    const shares = normalizeShares(rows.map((r) => Number(r.sharePercentage) || 0));
    start(async () => {
      const res = await createProject({
        name,
        description: String(fd.get("description") ?? ""),
        contractValue: Number(contractStr) || 0,
        status: String(fd.get("status") ?? "ACTIVE"),
        splits: rows.map((r, i) => ({
          partnerId: r.partnerId,
          sharePercentage: shares[i] ?? 0,
        })),
        initialExpenses: filled.map((r) => ({
          title: r.title.trim(),
          amount: Number(r.amount),
          paidByPartnerId: r.paidBy,
        })),
      });
      if (!res.ok) {
        fail(res.error);
      } else {
        toast.success(tp.createdToast(name || "—"));
        onSuccess?.();
        router.push(`/projects/${res.data.id}`);
      }
    });
  }

  function preset5050() {
    if (rows.length < 2) return;
    const next = rows.map((r, i) =>
      i === 0
        ? { ...r, sharePercentage: 50 }
        : i === 1
          ? { ...r, sharePercentage: 50 }
          : { ...r, sharePercentage: 0 },
    );
    setRows(next);
  }

  function splitEqually() {
    const shares = equalSplit(rows.length);
    setRows(rows.map((r, i) => ({ ...r, sharePercentage: shares[i] ?? 0 })));
  }

  function resetDefaults() {
    const next = partners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      sharePercentage: p.defaultSharePercentage,
    }));
    setRows(next);
    toast.success(t.copyDefaults);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Live financial preview */}
      <FinancePill
        lang={lang}
        contractValue={contractValue}
        firmExpenses={totalExpenses}
        clientCovered={clientExpenses}
      />

      <div className="grid gap-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input id="name" name="name" required maxLength={150} placeholder={t.namePh} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contractValue">{t.contractValue}</Label>
          <div className="flex items-center gap-1.5">
            <Input
              id="contractValue"
              name="contractValue"
              type="number"
              required
              placeholder="50000"
              value={contractStr}
              onChange={(e) => setContractStr(sanitizeNumericInput(e.target.value))}
              className="min-w-0 flex-1 text-end font-mono tabular-nums"
            />
            <span className="shrink-0 text-xs text-muted-foreground">
              {lang === "ar" ? "ج.م" : "EGP"}
            </span>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">{t.status}</Label>
          <select
            id="status"
            name="status"
            defaultValue="ACTIVE"
            className="flex h-10 w-full rounded-xl border border-input bg-card px-3 text-base shadow-sm sm:text-sm"
          >
            <option value="UPCOMING">{t.statuses.UPCOMING}</option>
            <option value="ACTIVE">{t.statuses.ACTIVE}</option>
            <option value="COMPLETED">{t.statuses.COMPLETED}</option>
            <option value="ON_HOLD">{t.statuses.ON_HOLD}</option>
            <option value="CANCELLED">{t.statuses.CANCELLED}</option>
          </select>
        </div>
      </div>

      {/* Initial project expenses */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between gap-2">
          <Label>{t.expensesTitle}</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(true)}>
            <Plus className="h-4 w-4" /> {t.addItem}
          </Button>
        </div>
        {items.map((it) => (
          <div
            key={it.key}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-2.5 sm:p-0 sm:border-0 sm:bg-transparent"
          >
            <Input
              ref={(el) => {
                if (el) titleRefs.current.set(it.key, el);
                else titleRefs.current.delete(it.key);
              }}
              value={it.title}
              onChange={(e) => updateItem(it.key, { title: e.target.value })}
              placeholder={t.itemNamePh}
              maxLength={500}
              aria-label={t.itemName}
              className="min-w-0 flex-1"
            />
            <div className="flex items-center gap-2">
              <select
                value={it.paidBy}
                onChange={(e) => updateItem(it.key, { paidBy: e.target.value })}
                aria-label={tf.paidBy}
                className="h-10 min-w-0 flex-1 sm:w-32 sm:flex-initial shrink-0 rounded-xl border border-input bg-card px-2 text-base shadow-sm sm:text-sm"
              >
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value={CLIENT_PAYER}>{tf.clientPaid}</option>
              </select>
              <div className="flex w-28 sm:w-32 shrink-0 items-center gap-1">
                <Input
                  type="number"
                  value={it.amount}
                  onChange={(e) =>
                    updateItem(it.key, { amount: sanitizeNumericInput(e.target.value) })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem(true);
                    }
                  }}
                  placeholder="5000"
                  aria-label={t.cost}
                  className="min-w-0 flex-1 text-end font-mono tabular-nums"
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {lang === "ar" ? "ج.م" : "EGP"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeItem(it.key)}
                title={t.cost}
                aria-label={t.cost}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{t.description}</Label>
        <Textarea id="description" name="description" placeholder={t.descPh} />
      </div>

      <div className="space-y-3 border-t border-border/60 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>{t.snapshot}</Label>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
              {t.copyDefaults}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={splitEqually}>
              {t.equalSplit}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={preset5050}>
              {t.half}
            </Button>
          </div>
        </div>
        <EquityBar
          rows={rows.map((r) => ({
            partnerId: r.partnerId,
            name: r.name,
            sharePercentage: Number(r.sharePercentage) || 0,
          }))}
          lang={lang}
          balancedLabel={t.balanced}
          offLabel={t.offBy}
        />
        <SplitsEditor rows={rows} onChange={setRows} lang={lang} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.creating : t.create}
      </Button>
    </form>
  );
}
