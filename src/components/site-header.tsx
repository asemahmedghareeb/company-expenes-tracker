"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

export function SiteHeader({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const pathname = usePathname();
  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/projects", label: t.nav.projects },
    { href: "/partners", label: t.nav.partners },
    { href: "/company", label: t.nav.company },
    { href: "/ledger", label: t.nav.ledger },
    { href: "/summary", label: t.nav.summary },
  ];

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 backdrop-blur-xl"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-105">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="hidden tracking-tight md:inline">{t.brand}</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const isActive =
              l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "rounded-full bg-accent px-3 py-1.5 whitespace-nowrap font-medium text-accent-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    : "rounded-full px-3 py-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher lang={lang} />
        </div>
      </div>
    </header>
  );
}
