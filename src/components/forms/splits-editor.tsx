"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

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
  const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
  const valid = Math.abs(total - 100) < 0.01;

  return (
    <div className="space-y-3">
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
              min={0}
              max={100}
              step={0.01}
              value={row.sharePercentage}
              onChange={(e) =>
                onChange(
                  rows.map((r) =>
                    r.partnerId === row.partnerId
                      ? { ...r, sharePercentage: Number(e.target.value) }
                      : r,
                  ),
                )
              }
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
