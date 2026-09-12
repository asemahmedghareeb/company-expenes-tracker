"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, LogOut, X } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { InstallButton } from "./install-button";
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
    const raf = requestAnimationFrame(() => setMenuOpen(false));
    return () => cancelAnimationFrame(raf);
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
      className="sticky top-0 z-40 border-b border-border/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]"
      style={{ background: "var(--header-bg)" }}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3.5 sm:gap-3 sm:px-6 lg:px-8">
        {/* Brand / Logo — always prominently visible, never clipped or truncated */}
        <Link href="/" className="group flex shrink-0 items-center gap-2 sm:gap-2.5 font-semibold">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card border border-border/70 p-1 shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="TADX Finance"
              width={32}
              height={32}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </span>
          <span className="shrink-0 whitespace-nowrap text-sm sm:text-base font-bold tracking-tight text-foreground" dir="ltr">
            {t.brand}
          </span>
        </Link>

        {/* Desktop / wide-tablet pill bar */}
        {user && (
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 text-xs xl:gap-1.5 xl:text-sm lg:flex overflow-x-auto no-scrollbar"
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
                    "rounded-full px-2 py-1 whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground xl:px-2.5 xl:py-1.5",
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

        {/* Actions & Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {user && (
            <span className="hidden max-w-24 truncate text-xs font-medium text-muted-foreground xl:inline">
              {user.username}
            </span>
          )}
          <InstallButton lang={lang} />
          <ThemeToggle />
          <LanguageSwitcher lang={lang} />
          {user && (
            <form action={logout} className="hidden sm:block">
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

          {/* Mobile menu toggle — placed at the end corner for natural mobile accessibility */}
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
        </div>

        {/* Mobile dropdown panel + backdrop overlay */}
        {user && menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <nav
              aria-label="Primary"
              className="absolute inset-x-3 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-2.5 shadow-2xl lg:hidden space-y-1"
            >
              <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b border-border/60 mb-1.5">
                <span className="font-semibold text-foreground">{user.username}</span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t.auth.logout}
                  </button>
                </form>
              </div>
              {links.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    prefetch={true}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                      active
                        ? "bg-accent font-semibold text-accent-foreground shadow-xs"
                        : "text-foreground",
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </header>
  );
}
