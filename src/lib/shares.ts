/**
 * Equity share helpers — pure, client-safe (no DB, no I/O).
 *
 * Core idea: percentages are stored at FULL float precision and only
 * DISPLAYED rounded to 2 decimals. Three equal partners each own exactly
 * 100/3 = 33.333…% (all rows display the identical "33.33"), instead of
 * forcing a visible 33.34/33.33/33.33 asymmetry to satisfy 2-decimal math.
 *
 * Rounding dust (e.g. a user typing 33.33 three times = 99.99) is
 * auto-normalized on save by scaling proportionally to exactly 100,
 * so stored data ALWAYS sums to 100. Genuinely wrong splits (off by more
 * than EQUITY_TOLERANCE) are still rejected by validation.
 */

export const EQUITY_TOTAL = 100;

/** Sentinel payer id meaning "covered directly by the client" (stored as NULL FK). */
export const CLIENT_PAYER = "CLIENT";

/** Accepts 2-decimal rounding dust (covers up to ~10 partners). */
export const EQUITY_TOLERANCE = 0.06;

export function sharesSumTo100(shares: number[]): boolean {
  const total = shares.reduce((a, b) => a + b, 0);
  return Math.abs(total - EQUITY_TOTAL) < EQUITY_TOLERANCE;
}

/**
 * Scale shares proportionally so they sum to exactly 100.
 * Returns values unchanged when they're already exact or when they're
 * too far off (validation must reject those instead of "fixing" them).
 */
export function normalizeShares(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0 || sum === EQUITY_TOTAL) return values;
  if (Math.abs(sum - EQUITY_TOTAL) >= EQUITY_TOLERANCE) return values;
  const factor = EQUITY_TOTAL / sum;
  return values.map((v) => Math.round(v * factor * 1e6) / 1e6);
}

/**
 * True equal split: every row gets exactly 100/count at full precision.
 * 3 partners → 33.333… each (all display "33.33", true sum = 100).
 */
export function equalSplit(count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, () => EQUITY_TOTAL / count);
}

/** Display string for a share input: max 2 decimals, trimmed ("33.33", "50"). */
export function formatShareInput(n: number): string {
  if (!Number.isFinite(n)) return "";
  return String(Number(n.toFixed(2)));
}

const EASTERN_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Sanitize a numeric keystroke: convert Eastern Arabic digits (٠-٩) and the
 * Arabic decimal separator (٫) to Latin, treat "," as ".", drop everything
 * else (letters can never even appear), keep at most one dot.
 * "٣٣٫٣٣" → "33.33", "ab3.5.2" → "3.52", "abc" → "".
 */
export function sanitizeNumericInput(raw: string): string {
  let out = raw
    .replace(/[٠-٩]/g, (d) => String(EASTERN_DIGITS.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/,/g, ".")
    .replace(/[^0-9.]/g, "");
  const dot = out.indexOf(".");
  if (dot !== -1) {
    out = out.slice(0, dot + 1) + out.slice(dot + 1).replace(/\./g, "");
  }
  return out;
}
