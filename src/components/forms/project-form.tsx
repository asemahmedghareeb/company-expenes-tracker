"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { createProject } from "@/actions/projects";
import { dict } from "@/lib/dict";
import { formatEGP, type Lang } from "@/lib/format";
import {
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
}: {
  partners: { id: string; name: string; defaultSharePercentage: number }[];
  lang: Lang;
}) {
  const t = dict[lang].projectForm;
  const tf = dict[lang].expenseForm;
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
  const netProfit = Math.max(0, contractValue - totalExpenses);

  function addItem() {
    setItems((xs) => [
      ...xs,
      { key: newKey(), title: "", amount: "", paidBy: partners[0]?.id ?? "" },
    ]);
  }

  function updateItem(key: string, patch: Partial<ExpenseRow>) {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  function removeItem(key: string) {
    setItems((xs) => xs.filter((x) => x.key !== key));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
    if (!sharesSumTo100(rows.map((r) => r.sharePercentage))) {
      setError(t.splitsError(total.toFixed(2)));
      return;
    }
    // Drop fully-empty rows; the rest must be complete.
    const filled = items.filter(
      (it) => it.title.trim() !== "" || (Number(it.amount) || 0) > 0,
    );
    for (const r of filled) {
      if (r.title.trim() === "" || !(Number(r.amount) > 0) || !r.paidBy) {
        setError(t.expenseError);
        return;
      }
    }
    const shares = normalizeShares(rows.map((r) => Number(r.sharePercentage) || 0));
    start(async () => {
      const res = await createProject({
        name: String(fd.get("name") ?? ""),
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
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${res.data.id}`);
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

  function resetDefaults() {
    setRows(
      partners.map((p) => ({
        partnerId: p.id,
        name: p.name,
        sharePercentage: p.defaultSharePercentage,
      })),
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input id="name" name="name" required maxLength={150} placeholder={t.namePh} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contractValue">{t.contractValue}</Label>
          <Input
            id="contractValue"
            name="contractValue"
            type="number"
            required
            placeholder="50000"
            value={contractStr}
            onChange={(e) => setContractStr(sanitizeNumericInput(e.target.value))}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">{t.status}</Label>
          <select
            id="status"
            name="status"
            defaultValue="ACTIVE"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="UPCOMING">{t.statuses.UPCOMING}</option>
            <option value="ACTIVE">{t.statuses.ACTIVE}</option>
            <option value="COMPLETED">{t.statuses.COMPLETED}</option>
            <option value="ON_HOLD">{t.statuses.ON_HOLD}</option>
            <option value="CANCELLED">{t.statuses.CANCELLED}</option>
          </select>
        </div>
      </div>

      {/* Initial project expenses (المصروفات) */}
      <div className="space-y-2">
        <Label>{t.expensesTitle}</Label>
        {items.map((it) => (
          <div key={it.key} className="flex items-center gap-2">
            <Input
              value={it.title}
              onChange={(e) => updateItem(it.key, { title: e.target.value })}
              placeholder={t.itemNamePh}
              maxLength={500}
              aria-label={t.itemName}
              className="min-w-0 flex-1"
            />
            <select
              value={it.paidBy}
              onChange={(e) => updateItem(it.key, { paidBy: e.target.value })}
              aria-label={tf.paidBy}
              className="h-9 w-28 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value={CLIENT_PAYER}>{tf.clientPaid}</option>
            </select>
            <div className="flex w-32 shrink-0 items-center gap-1">
              <Input
                value={it.amount}
                onChange={(e) =>
                  updateItem(it.key, { amount: sanitizeNumericInput(e.target.value) })
                }
                placeholder="5000"
                aria-label={t.cost}
                className="min-w-0 flex-1 text-end"
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
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full"
        >
          <Plus className="h-4 w-4" /> {t.addItem}
        </Button>
        {items.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.totalExpenses}</span>
              <span className="font-medium">{formatEGP(totalExpenses, lang)}</span>
            </div>
            {clientExpenses > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t.clientCovered}</span>
                <span className="font-medium">{formatEGP(clientExpenses, lang)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t.estProfit}</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {formatEGP(netProfit, lang)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">{t.description}</Label>
        <Textarea id="description" name="description" placeholder={t.descPh} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t.snapshot}</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
              {t.copyDefaults}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={preset5050}>
              {t.half}
            </Button>
          </div>
        </div>
        <SplitsEditor rows={rows} onChange={setRows} lang={lang} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.creating : t.create}
      </Button>
    </form>
  );
}
