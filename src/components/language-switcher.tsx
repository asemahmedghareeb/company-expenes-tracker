"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { setLang } from "@/actions/locale";
import type { Lang } from "@/lib/format";
import { cn } from "@/lib/utils";

/** عربي / EN toggle — persists via cookie, then re-renders server components. */
export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function switchTo(next: Lang) {
    if (next === lang) return;
    start(async () => {
      await setLang(next);
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center overflow-hidden rounded-xl border border-input bg-card text-xs font-semibold shadow-sm"
      role="group"
      aria-label="Language / اللغة"
    >
      {(["en", "ar"] as const).map((l) => (
        <Button
          key={l}
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => switchTo(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-7 rounded-none px-2.5",
            lang === l && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {l === "en" ? "EN" : "عربي"}
        </Button>
      ))}
    </div>
  );
}
