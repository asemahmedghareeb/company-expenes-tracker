"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

/** Native install prompt captured from Chromium (Android/desktop). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari (pre-16.4 has no display-mode support).
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent;
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (ua.includes("Macintosh") && "ontouchend" in document)
  );
}

/**
 * Phone-only PWA install entry (`md:hidden` — never renders on tablets/desktops).
 * - Chromium Android: fires the captured native install prompt.
 * - iPhone/iPad: iOS exposes no prompt, so it shows Add-to-Home-Screen steps.
 * - Hidden entirely when already installed or when the browser offers no path.
 */
export function InstallButton({ lang }: { lang: Lang }) {
  const t = dict[lang].pwa;
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(true); // hide until proven otherwise
  const [ios, setIos] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    // Deferred to rAF: first render (server + hydration) stays null so the
    // button never flashes on desktop/standalone, matching ThemeToggle.
    const raf = requestAnimationFrame(() => {
      if (!isStandalone()) {
        setInstalled(false);
        setIos(isIOS());
      }
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setHintOpen(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!hintOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHintOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hintOpen]);

  // Desktop/tablet: never shown. Installed or no install path: nothing to offer.
  if (installed || (!deferred && !ios)) return null;

  async function onClick() {
    if (deferred) {
      await deferred.prompt().catch(() => {
        /* user dismissed or prompt unavailable — stay put */
      });
      return;
    }
    setHintOpen((v) => !v);
  }

  return (
    <span className="shrink-0 md:hidden">
      <button
        type="button"
        onClick={onClick}
        title={t.install}
        aria-label={t.install}
        aria-expanded={ios && !deferred ? hintOpen : undefined}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Download className="h-4 w-4" />
      </button>

      {hintOpen && !deferred && (
        <span
          role="dialog"
          aria-label={t.iosTitle}
          className="absolute inset-x-4 top-[calc(100%+0.5rem)] z-50 block rounded-2xl border border-border/80 bg-card p-4 shadow-xl"
        >
          <span className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{t.iosTitle}</span>
            <button
              type="button"
              onClick={() => setHintOpen(false)}
              aria-label={t.close}
              autoFocus
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </span>
          <span className="block space-y-1.5 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Share className="h-3.5 w-3.5 shrink-0" />
              {t.iosStep1}
            </span>
            <span className="block">{t.iosStep2}</span>
            <span className="block">{t.iosStep3}</span>
          </span>
        </span>
      )}
    </span>
  );
}
