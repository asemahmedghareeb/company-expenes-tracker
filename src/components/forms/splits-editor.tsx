"use client";

import { useState } from "react";
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

  function splitEqually() {
    const shares = equalSplit(rows.length);
    setDrafts({});
    onChange(rows.map((r, i) => ({ ...r, sharePercentage: shares[i] ?? 0 })));
  }

  function handleType(row: SplitRow, raw: string) {
    setDrafts((d) => ({ ...d, [row.partnerId]: raw }));
    const trimmed = raw.trim();
    const n = Number(trimmed);
    if (trimmed !== "" && Number.isFinite(n)) {
      onChange(
        rows.map((r) =>
          r.partnerId === row.partnerId ? { ...r, sharePercentage: n } : r,
        ),
      );
    } else if (trimmed === "") {
      // Empty field counts as 0 toward the total until typing resumes.
      onChange(
        rows.map((r) =>
          r.partnerId === row.partnerId ? { ...r, sharePercentage: 0 } : r,
        ),
      );
    }
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
      <div className="flex justify-end">
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
          <div className="flex w-32 items-center gap-1">
            <Input
              type="number"
              value={drafts[row.partnerId] ?? formatShareInput(row.sharePercentage)}
              onChange={(e) => handleType(row, e.target.value)}
              onBlur={() => commitDraft(row.partnerId)}
              className="text-end"
            />
            <span className="text-sm text-muted-foreground">%</span>
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
