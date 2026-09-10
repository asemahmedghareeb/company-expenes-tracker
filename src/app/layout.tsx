import type { Metadata } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { dict, getLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Partner Ledger — Internal Financial Accounting",
  description:
    "Dynamic multi-partner accounting: snapshot equity, milestone payments, out-of-pocket expenses, drawings & live balances.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}
    >
      <body
        className={cn(
          "flex min-h-full flex-col bg-background text-foreground",
          lang === "ar" && "font-arabic",
        )}
      >
        <SiteHeader lang={lang} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          {dict[lang].footer}
        </footer>
      </body>
    </html>
  );
}
