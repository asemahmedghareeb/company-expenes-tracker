import Link from "next/link";
import { Wallet } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/format";

export function SiteHeader({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const links = [
    { href: "/", label: t.nav.dashboard },
    { href: "/projects", label: t.nav.projects },
    { href: "/partners", label: t.nav.partners },
    { href: "/ledger", label: t.nav.ledger },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">{t.brand}</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher lang={lang} />
      </div>
    </header>
  );
}
