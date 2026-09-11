"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, LogOut, Wallet, X } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/actions/auth";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SiteHeader({
  lang,
  user,
}: {
  lang: Lang;
  user: { username: string } | null;
}) {
  const t = dict[lang];
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/projects", label: t.nav.projects },
    { href: "/partners", label: t.nav.partners },
    { href: "/company", label: t.nav.company },
    { href: "/ledger", label: t.nav.ledger },
    { href: "/summary", label: t.nav.summary },
    { href: "/capital", label: t.nav.capital },
  ];
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  // Close the mobile menu on navigation or Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 backdrop-blur-xl"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        {/* Mobile menu toggle — the 7-link pill bar cannot fit phones, so it
            lives in a dropdown panel below `lg` instead of scrolling blindly. */}
        {user && (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card text-foreground shadow-sm transition-colors hover:bg-accent lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}
        <Link href="/" className="group flex min-w-0 shrink-0 items-center gap-2.5 font-semibold">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-200 group-hover:scale-105">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="hidden truncate tracking-tight min-[420px]:inline">
            {t.brand}
          </span>
        </Link>
        {/* Desktop / wide-tablet pill bar. `min-w-0` lets it shrink instead of
            pushing the toggles off-screen; the edge fade hints scrollability
            when the 7 labels overflow at ~lg widths. Hidden for visitors. */}
        {user && (
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] rtl:[mask-image:linear-gradient(to_left,black_calc(100%-2rem),transparent)]"
          >
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground xl:px-3",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}
        {/* Spacer keeps brand + toggles spread on mobile where nav is hidden. */}
        <div className="min-w-0 flex-1" />
        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <span className="hidden max-w-28 truncate text-sm font-medium text-muted-foreground sm:inline">
              {user.username}
            </span>
          )}
          <ThemeToggle />
          <LanguageSwitcher lang={lang} />
          {user && (
            <form action={logout}>
              <button
                type="submit"
                title={t.auth.logout}
                aria-label={t.auth.logout}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-input bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        {/* Mobile dropdown panel — dir-agnostic (symmetric inset), same pills
            stacked full-width so nothing is ever clipped mid-word. Closes on
            navigation, Escape, or the toggle above. */}
        {user && menuOpen && (
          <nav
            aria-label="Primary"
            className="absolute inset-x-4 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border/80 bg-card p-2 shadow-xl lg:hidden"
          >
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={true}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-xl px-4 py-2.5 text-[15px] transition-colors hover:bg-accent hover:text-accent-foreground",
                    active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
