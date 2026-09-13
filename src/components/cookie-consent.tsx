"use client";

/**
 * Cookie consent — GDPR / ePrivacy + Egypt PDPL (Law 151/2020) posture.
 *
 * Current tracking audit (2026-09-13, verified by grep over src/ + package.json):
 * - Zero third-party scripts, iframes, pixels, or analytics SDKs.
 * - Fonts are self-hosted via next/font (no runtime Google Fonts request).
 * - Cookies actually set: `ledger_session` (httpOnly auth, 7d), `lang` (1y),
 *   `tadx_consent` (this banner, 1y). localStorage: `ledger-theme`, consent record.
 *
 * Consent model (see /cookies for the full table):
 * - essential:   always on, banner cannot disable. Covers session + consent
 *                record + UI language (strictly necessary for the requested service).
 * - preferences: display theme persistence (`ledger-theme`). Off by default
 *                until the user opts in; ThemeToggle checks this before writing.
 * - analytics:   RESERVED. No analytics scripts are installed, so this toggle
 *                currently gates nothing. Any future script MUST check
 *                `hasConsent("analytics")` or carry `data-consent="analytics"`
 *                and only execute after the `tadx:consent` event grants it.
 */

import { useCallback, useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import type { Lang } from "@/lib/format";

export interface ConsentState {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  ts: number;
}

export const CONSENT_KEY = "tadx-consent-v1";
export const CONSENT_COOKIE = "tadx_consent";

const DEFAULTS: ConsentState = {
  essential: true,
  preferences: false,
  analytics: false,
  ts: 0,
};

declare global {
  interface Window {
    __tadxConsent?: ConsentState;
  }
}

/** Read the stored consent (localStorage wins, cookie is the fallback). */
export function readConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConsentState;
      if (parsed && parsed.essential === true && typeof parsed.ts === "number") {
        return { ...DEFAULTS, ...parsed, essential: true };
      }
    }
  } catch {
    /* storage unavailable — fall through to cookie */
  }
  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
    if (match) {
      const parsed = JSON.parse(
        decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)),
      ) as ConsentState;
      if (parsed && parsed.essential === true) {
        return { ...DEFAULTS, ...parsed, essential: true };
      }
    }
  } catch {
    /* unparsable — treat as no consent */
  }
  return null;
}

/** Synchronous gate for future tracking scripts. */
export function hasConsent(category: "preferences" | "analytics"): boolean {
  if (typeof window === "undefined") return false;
  return window.__tadxConsent?.[category] === true;
}

function persist(next: ConsentState) {
  const withTs = { ...next, essential: true as const, ts: Date.now() };
  window.__tadxConsent = withTs;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(withTs));
  } catch {
    /* private mode — cookie below still records the choice */
  }
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie =
      `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(withTs))}` +
      `; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
  } catch {
    /* cookies blocked — in-memory + event still apply for this session */
  }
  if (withTs.preferences === false) {
    // Best-effort: drop the theme preference so a "reject" is actually honored.
    try {
      window.localStorage.removeItem("ledger-theme");
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent("tadx:consent", { detail: withTs }));
}

const COPY: Record<
  Lang,
  {
    bannerText: string;
    customize: string;
    reject: string;
    accept: string;
    prefsTitle: string;
    prefsDesc: string;
    essential: string;
    essentialDesc: string;
    alwaysOn: string;
    preferences: string;
    preferencesDesc: string;
    analytics: string;
    analyticsDesc: string;
    save: string;
    policyLink: string;
    close: string;
  }
> = {
  en: {
    bannerText:
      "We use strictly-necessary cookies to keep you signed in and remember your language. Optional theme memory needs your consent.",
    customize: "Customize",
    reject: "Reject optional",
    accept: "Accept all",
    prefsTitle: "Cookie preferences",
    prefsDesc:
      "Choose which optional storage we may use. Essential cookies are always on because the app cannot work without them.",
    essential: "Essential",
    essentialDesc: "Sign-in session, consent record, UI language. Always on.",
    alwaysOn: "Always on",
    preferences: "Preferences",
    preferencesDesc: "Remember light/dark theme on this device.",
    analytics: "Analytics",
    analyticsDesc:
      "Not in use. No analytics scripts are installed; enabling this changes nothing today.",
    save: "Save choices",
    policyLink: "Cookie Policy",
    close: "Close preferences",
  },
  ar: {
    bannerText:
      "نستخدم ملفات تعريف ارتباط ضرورية لإبقاء تسجيل الدخول وتذكر اللغة. حفظ المظهر يحتاج موافقتك.",
    customize: "تخصيص",
    reject: "رفض الاختيارية",
    accept: "قبول الكل",
    prefsTitle: "تفضيلات ملفات الارتباط",
    prefsDesc:
      "اختر التخزين الاختياري المسموح. الضرورية تعمل دائما لأن التطبيق لا يعمل بدونها.",
    essential: "ضرورية",
    essentialDesc: "جلسة الدخول وسجل الموافقة ولغة الواجهة. تعمل دائما.",
    alwaysOn: "تعمل دائما",
    preferences: "التفضيلات",
    preferencesDesc: "تذكر المظهر الفاتح/الداكن على هذا الجهاز.",
    analytics: "التحليلات",
    analyticsDesc:
      "غير مستخدمة. لا توجد سكربتات تحليلات مثبتة، وتفعيلها لا يغير شيئا حاليا.",
    save: "حفظ الاختيارات",
    policyLink: "سياسة ملفات الارتباط",
    close: "إغلاق التفضيلات",
  },
};

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
        checked ? "border-primary bg-primary" : "border-input bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        aria-hidden
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${
          checked ? "start-[22px]" : "start-[3px]"
        }`}
      />
    </button>
  );
}

export function CookieConsent({ lang }: { lang: Lang }) {
  const t = COPY[lang];
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(DEFAULTS);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      window.__tadxConsent = stored;
      return;
    }
    window.__tadxConsent = { ...DEFAULTS };
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Footer "Cookie settings" re-opens the modal from anywhere.
  useEffect(() => {
    const reopen = () => {
      setDraft(readConsent() ?? DEFAULTS);
      setPrefsOpen(true);
    };
    window.addEventListener("tadx:open-cookie-settings", reopen);
    return () => window.removeEventListener("tadx:open-cookie-settings", reopen);
  }, []);

  // Escape closes the preferences modal (banner itself is a conscious choice).
  useEffect(() => {
    if (!prefsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPrefsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prefsOpen]);

  const choose = useCallback((next: ConsentState) => {
    persist(next);
    setVisible(false);
    setPrefsOpen(false);
  }, []);

  if (!visible && !prefsOpen) return null;

  return (
    <>
      {visible && !prefsOpen && (
        <div
          role="region"
          aria-label={t.prefsTitle}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 shadow-2xl sm:inset-x-6 sm:bottom-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Cookie className="h-4 w-4" aria-hidden />
            </span>
            <p className="flex-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {t.bannerText}{" "}
              <a href="/cookies" className="font-medium text-foreground underline underline-offset-4">
                {t.policyLink}
              </a>
            </p>
          </div>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setDraft(readConsent() ?? DEFAULTS);
                setPrefsOpen(true);
              }}
              className="rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent sm:text-sm"
            >
              {t.customize}
            </button>
            <button
              type="button"
              onClick={() => choose({ ...DEFAULTS })}
              className="rounded-lg border border-input bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-accent sm:text-sm"
            >
              {t.reject}
            </button>
            <button
              type="button"
              onClick={() => choose({ ...DEFAULTS, preferences: true, analytics: true })}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-110 sm:text-sm"
            >
              {t.accept}
            </button>
          </div>
        </div>
      )}

      {prefsOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-prefs-title"
            className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="cookie-prefs-title" className="text-base font-bold">
                  {t.prefsTitle}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.prefsDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => setPrefsOpen(false)}
                aria-label={t.close}
                autoFocus
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div>
                  <p className="text-sm font-semibold">{t.essential}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.essentialDesc}</p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">{t.alwaysOn}</span>
                  <Toggle checked disabled label={t.essential} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div>
                  <p className="text-sm font-semibold">{t.preferences}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.preferencesDesc}</p>
                </div>
                <Toggle
                  checked={draft.preferences}
                  onChange={(v) => setDraft((d) => ({ ...d, preferences: v }))}
                  label={t.preferences}
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div>
                  <p className="text-sm font-semibold">{t.analytics}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.analyticsDesc}</p>
                </div>
                <Toggle
                  checked={draft.analytics}
                  onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
                  label={t.analytics}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => choose(draft)}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:brightness-110"
            >
              {t.save}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Footer button that re-opens the preferences modal. */
export function CookieSettingsButton({ lang }: { lang: Lang }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tadx:open-cookie-settings"))}
      className="underline-offset-4 hover:underline hover:text-foreground"
    >
      {lang === "ar" ? "إعدادات ملفات الارتباط" : "Cookie settings"}
    </button>
  );
}
