/**
 * In-memory sliding-window rate limiter (per key: IP, IP+route, …).
 *
 * Proxy-safe: pure TS, no `next/headers`, no I/O — importable from
 * `src/proxy.ts` and from Server Actions alike.
 *
 * LIMITATIONS (read before scaling):
 * - Single-instance memory. On multi-instance/serverless deployments each
 *   isolate tracks its own counters, so a distributed flood gets
 *   `instances × limit` headroom. This is a correct backstop for an internal
 *   tool, not a DDoS shield.
 * - Upgrade path: swap the Map for Upstash/Vercel KV or Redis with the same
 *   `checkRateLimit(key, opts)` signature (atomic INCR + EXPIRE per window).
 */

export interface RateLimitOptions {
  /** Max hits allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** 0 when ok; otherwise ms until the oldest hit slides out. */
  retryAfterMs: number;
  remaining: number;
}

const buckets = new Map<string, number[]>();
/** Bound memory: worst case MAX_BUCKETS distinct keys per isolate. */
const MAX_BUCKETS = 20_000;

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  let hits = buckets.get(key);
  if (!hits) {
    hits = [];
    if (buckets.size >= MAX_BUCKETS) {
      // Evict oldest-inserted keys (Map preserves insertion order).
      const evict = Math.ceil(MAX_BUCKETS / 10);
      let n = 0;
      for (const k of buckets.keys()) {
        buckets.delete(k);
        if (++n >= evict) break;
      }
    }
    buckets.set(key, hits);
  }
  // In-place prune of expired hits (avoids per-request array churn).
  let write = 0;
  for (let i = 0; i < hits.length; i++) {
    if (hits[i]! > cutoff) hits[write++] = hits[i]!;
  }
  hits.length = write;

  if (hits.length >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, hits[0]! + opts.windowMs - now), remaining: 0 };
  }
  hits.push(now);
  return { ok: true, retryAfterMs: 0, remaining: opts.limit - hits.length };
}

/** Best-effort client IP: Vercel/CDN `x-forwarded-for` first entry. */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Whole seconds, rounded up — for `Retry-After` headers and messages. */
export function retryAfterSeconds(retryAfterMs: number): number {
  return Math.max(1, Math.ceil(retryAfterMs / 1000));
}
