export type Lang = "en" | "ar";

/**
 * Format a money figure in Egyptian Pounds.
 * - en → "EGP 1,000.00"
 * - ar → "1,000.00 ج.م" (Latin digits via nu-latn, Arabic currency marker)
 */
export function formatEGP(n: number | string, lang: Lang = "en"): string {
  let num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) < 0.005) num = 0;
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatMoney(n: number | string): string {
  let num = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(num)) return "—";
  if (Math.abs(num) < 0.005) num = 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPct(n: number): string {
  return `${Number(n).toFixed(2)}%`;
}

export function formatDate(d: Date | string, lang: Lang = "en"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
