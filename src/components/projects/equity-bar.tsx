"use client";

import { cn } from "@/lib/utils";
import { EQUITY_TOLERANCE, EQUITY_TOTAL } from "@/lib/shares";

/**
 * Segmented equity allocation bar.
 * Balanced (100%) → flat brand/neutral segments.
 * Deviated → amber/rose ring + exact numeric delta.
 * Direction-agnostic: flex row follows `dir`, works in RTL/LTR.
 */

const SEGMENT_TONES = [
  "bg-indigo-500/85",
  "bg-sky-500/85",
  "bg-emerald-500/85",
  "bg-amber-500/85",
  "bg-rose-500/85",
  "bg-violet-500/85",
  "bg-teal-500/85",
  "bg-orange-500/85",
];

export function EquityBar({
  rows,
  lang,
  balancedLabel,
  offLabel,
}: {
  rows: { partnerId: string; name: string; sharePercentage: number }[];
  lang: "en" | "ar";
  balancedLabel: string;
  offLabel: (delta: string) => string;
}) {
  const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
  const valid = Math.abs(total - EQUITY_TOTAL) < EQUITY_TOLERANCE;
  const delta = total - EQUITY_TOTAL;
  const deltaStr = `${delta > 0 ? "+" : ""}${delta.toFixed(2)}%`;

  return (
    <div className="space-y-2">
      {/* Segmented track */}
      <div
        role="img"
        aria-label={`${total.toFixed(2)}%`}
        className={cn(
          "flex h-2.5 w-full gap-px overflow-hidden rounded-full border bg-muted/60 p-px",
          valid ? "border-border/60" : "border-amber-500/50",
        )}
      >
        {rows.map((r, i) => {
          const w = Math.max(0, Math.min(100, Number(r.sharePercentage) || 0));
          if (w <= 0) return null;
          return (
            <div
              key={r.partnerId}
              title={`${r.name} · ${Number(r.sharePercentage || 0).toFixed(2)}%`}
              style={{ width: `${w}%` }}
              className={cn(
                "h-full min-w-1 shrink-0 rounded-full transition-all",
                valid ? SEGMENT_TONES[i % SEGMENT_TONES.length] : "bg-amber-500/85",
              )}
            />
          );
        })}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium tabular-nums",
            valid
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              valid ? "bg-emerald-500" : "bg-amber-500",
            )}
          />
          {valid ? balancedLabel : offLabel(deltaStr)}
        </span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {total.toFixed(2)}% / 100%
        </span>
      </div>

      {/* Legend */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map((r, i) => (
          <li
            key={r.partnerId}
            className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-[4px]",
                valid ? SEGMENT_TONES[i % SEGMENT_TONES.length] : "bg-amber-500/85",
              )}
            />
            <span className="truncate">{r.name}</span>
            <span className="ms-auto font-mono tabular-nums">
              {lang === "ar"
                ? `${Number(r.sharePercentage || 0).toFixed(2)}٪`
                : `${Number(r.sharePercentage || 0).toFixed(2)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
