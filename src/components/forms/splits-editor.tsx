"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
import {
  equalSplit,
  formatShareInput,
  normalizeShares,
  sanitizeNumericInput,
  sharesSumTo100,
} from "@/lib/shares";

export interface SplitRow {
  partnerId: string;
  name: string;
  sharePercentage: number;
  active?: boolean;
}

export function SplitsEditor({
  rows,
  onChange,
  lang,
}: {
  rows: SplitRow[];
  onChange: (rows: SplitRow[]) => void;
  lang: Lang;
}) {
  const t = dict[lang].splits;
  const shares = rows.map((r) => r.sharePercentage);
  const valid = sharesSumTo100(shares);
  // Show the normalized total (what will actually be saved): 33.33×3 reads
  // 100.00% ✓ instead of 99.99% ✓.
  const total = normalizeShares(shares).reduce((a, b) => a + b, 0);

  /**
   * Free-typing drafts: the input shows the raw typed text (so clearing
   * the field or typing partial decimals like "33." works naturally),
   * while only valid numbers propagate to the parent rows for the total.
   */
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  /**
   * The last row is the balancer: it auto-computes as 100 − Σ(others)
   * whenever a non-last row changes — until the user types in it manually.
   * "Split equally" resets it to auto mode.
   */
  const [touchedLast, setTouchedLast] = useState(false);

  function splitEqually() {
    const shares = equalSplit(rows.length);
    setDrafts({});
    setTouchedLast(false);
    onChange(rows.map((r, i) => ({ ...r, sharePercentage: shares[i] ?? 0 })));
  }

  function handleType(row: SplitRow, raw: string) {
    // Sanitize first: letters never enter the field, Eastern Arabic digits convert.
    const clean = sanitizeNumericInput(raw);
    const trimmed = clean.trim();
    // Lone "." is mid-typing (e.g. about to become ".5"): keep the draft, count 0.
    const parsed = trimmed === "" || trimmed === "." ? 0 : Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    // Hard cap: a single share can never exceed 100.
    const clamped = Math.min(parsed, 100);
    const shown = trimmed === "." ? "." : clamped !== parsed ? String(clamped) : clean;

    const lastId = rows.length > 0 ? rows[rows.length - 1]?.partnerId : undefined;
    const isLast = row.partnerId === lastId;
    if (isLast && trimmed !== "") setTouchedLast(true);

    let next = rows.map((r) =>
      r.partnerId === row.partnerId ? { ...r, sharePercentage: clamped } : r,
    );

    // Auto-balance: all other rows filled + last untouched → last = remainder.
    let autoFired = false;
    if (!isLast && !touchedLast && next.length > 1 && lastId) {
      const others = next.filter((r) => r.partnerId !== lastId);
      const allEntered = others.every((r) => {
        const text =
          r.partnerId === row.partnerId ? shown : (drafts[r.partnerId] ?? String(r.sharePercentage));
        const v = text.trim();
        return v !== "" && Number.isFinite(Number(v));
      });
      if (allEntered) {
        const sumOthers = others.reduce(
          (a, r) => a + (r.partnerId === row.partnerId ? clamped : r.sharePercentage),
          0,
        );
        const remainder = 100 - sumOthers;
        if (remainder >= 0) {
          autoFired = true;
          next = next.map((r) =>
            r.partnerId === lastId ? { ...r, sharePercentage: remainder } : r,
          );
        }
      }
    }

    setDrafts((d) => {
      const nextDrafts = { ...d, [row.partnerId]: shown };
      // Drop the last row's draft when auto-balance recomputed it.
      if (autoFired && lastId) delete nextDrafts[lastId];
      return nextDrafts;
    });
    onChange(next);
  }

  function clearRow(row: SplitRow) {
    if (row.partnerId === rows[rows.length - 1]?.partnerId) setTouchedLast(false);
    setDrafts((d) => ({ ...d, [row.partnerId]: "" }));
    onChange(
      rows.map((r) =>
        r.partnerId === row.partnerId ? { ...r, sharePercentage: 0 } : r,
      ),
    );
  }

  function commitDraft(partnerId: string) {
    setDrafts((d) => {
      if (!(partnerId in d)) return d;
      const rest = { ...d };
      delete rest[partnerId];
      return rest;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{t.autoHint}</span>
        <Button type="button" variant="outline" size="sm" onClick={splitEqually}>
          ⚖ {t.equal}
        </Button>
      </div>
      {rows.map((row) => (
        <div key={row.partnerId} className="flex items-center gap-3">
          <div className="flex-1">
            <Label>{row.name}</Label>
            {!row.active && row.active !== undefined && (
              <span className="ms-2 text-xs text-muted-foreground">{t.inactive}</span>
            )}
          </div>
          <div className="flex w-44 items-center gap-1">
            <Input
              type="number"
              value={drafts[row.partnerId] ?? formatShareInput(row.sharePercentage)}
              onChange={(e) => handleType(row, e.target.value)}
              onBlur={() => commitDraft(row.partnerId)}
              className="min-w-0 flex-1 text-end"
            />
            <span className="shrink-0 text-sm text-muted-foreground">%</span>
            <button
              type="button"
              onClick={() => clearRow(row)}
              title={t.clear}
              aria-label={`${t.clear} ${row.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <div
        className={cn(
          "rounded-md border px-3 py-2 text-sm font-medium",
          valid
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
        )}
      >
        {t.total(total.toFixed(2), valid)}
      </div>
    </div>
  );
}
