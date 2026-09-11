/**
 * Dashboard date-range helpers — pure, client-safe (no DB, no I/O).
 *
 * Modes: "all" (no filtering) · "month" (YYYY-MM) · "year" (YYYY) ·
 * "custom" (from/to YYYY-MM-DD, both inclusive).
 *
 * Bounds are half-open UTC instants: { from, toExclusive }. This matches
 * `monthKey()` in lib/ledger (UTC getters), so a bill dated inside the
 * selected month/year/period always lands in it regardless of TZ offset.
 */

export type RangeMode = "all" | "month" | "year" | "custom";

export interface DateBounds {
  from: Date;
  /** Exclusive upper bound. */
  toExclusive: Date;
}

export interface ParsedRange {
  mode: RangeMode;
  bounds: DateBounds | null;
  /** Echoed, validated params (for controlled inputs). */
  month: string;
  year: string;
  fromStr: string;
  toStr: string;
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR_RE = /^(\d{4})$/;
const DAY_RE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isRealDay(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

export function monthBounds(month: string): DateBounds | null {
  const m = MONTH_RE.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return {
    from: new Date(Date.UTC(y, mo - 1, 1)),
    toExclusive: new Date(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1)),
  };
}

export function yearBounds(year: string): DateBounds | null {
  const m = YEAR_RE.exec(year);
  if (!m) return null;
  const y = Number(m[1]);
  return {
    from: new Date(Date.UTC(y, 0, 1)),
    toExclusive: new Date(Date.UTC(y + 1, 0, 1)),
  };
}

export function customBounds(fromStr: string, toStr: string): DateBounds | null {
  const a = DAY_RE.exec(fromStr);
  const b = DAY_RE.exec(toStr);
  if (!a || !b) return null;
  const fy = Number(a[1]);
  const fm = Number(a[2]);
  const fd = Number(a[3]);
  const ty = Number(b[1]);
  const tm = Number(b[2]);
  const td = Number(b[3]);
  if (!isRealDay(fy, fm, fd) || !isRealDay(ty, tm, td)) return null;
  const from = new Date(Date.UTC(fy, fm - 1, fd));
  // Inclusive `to` → exclusive end = start of the next UTC day.
  const toExclusive = new Date(Date.UTC(ty, tm - 1, td + 1));
  if (from.getTime() > toExclusive.getTime()) return null;
  return { from, toExclusive };
}

export function currentMonthStr(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function currentYearStr(d = new Date()): string {
  return String(d.getUTCFullYear());
}

export function toDayStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function parseRangeParams(params: {
  range?: string;
  month?: string;
  year?: string;
  from?: string;
  to?: string;
}): ParsedRange {
  const fallback: ParsedRange = {
    mode: "all",
    bounds: null,
    month: "",
    year: "",
    fromStr: "",
    toStr: "",
  };
  const mode = params.range;
  if (mode === "month" && params.month) {
    const bounds = monthBounds(params.month);
    if (!bounds) return fallback;
    return { mode, bounds, month: params.month, year: "", fromStr: "", toStr: "" };
  }
  if (mode === "year" && params.year) {
    const bounds = yearBounds(params.year);
    if (!bounds) return fallback;
    return { mode, bounds, month: "", year: params.year, fromStr: "", toStr: "" };
  }
  if (mode === "custom" && params.from && params.to) {
    const bounds = customBounds(params.from, params.to);
    if (!bounds) return fallback;
    return { mode, bounds, month: "", year: "", fromStr: params.from, toStr: params.to };
  }
  return fallback;
}
