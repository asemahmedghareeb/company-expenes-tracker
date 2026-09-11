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
  title: "Partner Ledger — Internal Financial Accounting",
  description:
    "Dynamic multi-partner accounting: snapshot equity, milestone payments, out-of-pocket expenses, drawings & live balances.",
  applicationName: "Partner Ledger",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "Partner Ledger",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
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
        <main className="animate-rise mx-auto w-full max-w-6xl flex-1 px-3.5 py-4 sm:px-6 sm:py-8">
          {children}
        </main>
        <Toaster position="top-center" dir={dir} gap={8} />
        <SwRegister />
        <footer className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
          {dict[lang].footer}
        </footer>
      </body>
    </html>
  );
}
