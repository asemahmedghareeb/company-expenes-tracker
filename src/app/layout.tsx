import type { Metadata, Viewport } from "next";
import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SwRegister } from "@/components/sw-register";
import { themeInitScript } from "@/components/theme-toggle";
import { dict, getLang } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth";
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
  metadataBase: new URL("https://tadx.finance"),
  title: {
    default: "TADX Finance | Company expenses, partner settlements, treasury",
    template: "%s | TADX Finance",
  },
  description:
    "TADX Finance is a private ledger for small firms: track project expenses, split profit by equity, settle partner balances, and audit company overhead and treasury custody.",
  applicationName: "TADX Finance",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "TADX Finance",
    title: "TADX Finance | Partner ledger and company treasury",
    description:
      "Track project costs, settle partner balances, and reconcile company overhead in one private ledger.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "TADX Finance" }],
  },
  twitter: {
    card: "summary",
    title: "TADX Finance | Partner ledger and company treasury",
    description:
      "Track project costs, settle partner balances, and reconcile company overhead in one private ledger.",
    images: ["/icon-512.png"],
  },
  appleWebApp: {
    capable: true,
    title: "TADX Finance",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/** Mobile viewport: no shrink-to-fit, edge-to-edge on notched phones. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b16" },
  ],
};

export const preferredRegion = "dub1";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const user = await getSessionUser().catch(() => null);

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={cn(
          "flex min-h-full flex-col bg-background text-foreground",
          lang === "ar" && "font-arabic",
        )}
      >
        <SiteHeader lang={lang} user={user} />
        <main className="animate-rise mx-auto w-full max-w-6xl flex-1 flex flex-col min-w-0 px-3.5 py-3 sm:px-6 sm:py-6 overflow-x-hidden">
          {children}
        </main>
        <Toaster position="top-center" dir={dir} gap={8} />
        <SwRegister />
        <footer className="border-t border-border/70 py-4 shrink-0">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-3.5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>{dict[lang].footer}</span>
            <nav aria-label="Legal" className="flex items-center gap-4">
              <a href="/terms" className="underline-offset-4 hover:underline hover:text-foreground">
                {lang === "ar" ? "الشروط والأحكام" : "Terms"}
              </a>
              <a href="/privacy" className="underline-offset-4 hover:underline hover:text-foreground">
                {lang === "ar" ? "سياسة الخصوصية" : "Privacy"}
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
