"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { dict } from "@/lib/dict";
import { formatDate, type Lang } from "@/lib/format";
import {
  currentMonthStr,
  currentYearStr,
  customBounds,
  toDayStr,
  type RangeMode,
} from "@/lib/range";
import { cn } from "@/lib/utils";

function monthName(month: string, lang: Lang): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

export function RangeFilter({
  lang,
  mode,
  month,
  year,
  fromStr,
  toStr,
}: {
  lang: Lang;
  mode: RangeMode;
  month: string;
  year: string;
  fromStr: string;
  toStr: string;
}) {
  const t = dict[lang].rangeFilter;
  const router = useRouter();
  const pathname = usePathname();
  const [yearDraft, setYearDraft] = useState(year || currentYearStr());
  const [fromDraft, setFromDraft] = useState(fromStr);
  const [toDraft, setToDraft] = useState(toStr);

  function go(params: string) {
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
  }

  function pickMode(next: RangeMode) {
    if (next === "all") return go("");
    if (next === "month") return go(`range=month&month=${month || currentMonthStr()}`);
    if (next === "year")
      return go(`range=year&year=${yearDraft.match(/^\d{4}$/) ? yearDraft : currentYearStr()}`);
    // Custom → default to the current month-to-today when nothing is set yet.
    const now = new Date();
    const first = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const f = fromDraft || fromStr || first;
    const d = toDraft || toStr || toDayStr(now);
    setFromDraft(f);
    setToDraft(d);
    return go(`range=custom&from=${f}&to=${d}`);
  }

  const chips: { id: RangeMode; label: string }[] = [
    { id: "all", label: t.all },
    { id: "month", label: t.month },
    { id: "year", label: t.year },
    { id: "custom", label: t.custom },
  ];

  const badge =
    mode === "month" && month
      ? monthName(month, lang)
      : mode === "year" && year
        ? year
        : mode === "custom" && fromStr && toStr
          ? `${formatDate(fromStr, lang)} – ${formatDate(toStr, lang)}`
          : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label={t.custom}
        className="flex items-center gap-1 rounded-xl border border-border/60 bg-card p-1 shadow-sm"
      >
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => pickMode(c.id)}
            aria-pressed={mode === c.id}
            className={cn(
              "h-7 rounded-lg px-2.5 text-xs font-medium transition-colors",
              mode === c.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {mode === "month" && (
        <Input
          type="month"
          aria-label={t.month}
          value={month || currentMonthStr()}
          onChange={(e) => {
            if (e.target.value) go(`range=month&month=${e.target.value}`);
          }}
          className="h-8 w-40 text-base sm:text-[13px]"
        />
      )}

      {mode === "year" && (
        <Input
          type="number"
          aria-label={t.year}
          value={yearDraft}
          min={2000}
          max={2100}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            setYearDraft(v);
            if (/^\d{4}$/.test(v)) go(`range=year&year=${v}`);
          }}
          className="h-8 w-24 text-base sm:text-[13px] tabular-nums"
        />
      )}

      {mode === "custom" && (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5">
            <Label htmlFor="range-from" className="text-xs text-muted-foreground">
              {t.from}
            </Label>
            <Input
              id="range-from"
              type="date"
              value={fromDraft}
              max={toDraft || undefined}
              onChange={(e) => {
                const f = e.target.value;
                setFromDraft(f);
                const dd = toDraft || toStr;
                if (f && dd && customBounds(f, dd)) go(`range=custom&from=${f}&to=${dd}`);
              }}
              className="h-8 w-auto text-base sm:text-[13px]"
            />
          </span>
          <span className="flex items-center gap-1.5">
            <Label htmlFor="range-to" className="text-xs text-muted-foreground">
              {t.to}
            </Label>
            <Input
              id="range-to"
              type="date"
              value={toDraft}
              min={fromDraft || undefined}
              onChange={(e) => {
                const d = e.target.value;
                setToDraft(d);
                const f = fromDraft || fromStr;
                if (f && d && customBounds(f, d)) go(`range=custom&from=${f}&to=${d}`);
              }}
              className="h-8 w-auto text-base sm:text-[13px]"
            />
          </span>
        </span>
      )}

      {badge && (
        <span className="inline-flex h-7 items-center rounded-full border border-border/60 bg-card px-2.5 text-xs font-medium tabular-nums">
          {badge}
        </span>
      )}
    </div>
  );
}
