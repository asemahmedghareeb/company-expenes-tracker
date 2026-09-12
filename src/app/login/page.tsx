import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dict, getLang } from "@/lib/i18n";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تسجيل الدخول | TADX Finance",
};

/** Public gate — authenticated visitors bounce straight into the app. */
export default async function LoginPage() {
  const [lang, session] = await Promise.all([
    getLang(),
    getSessionUser().catch(() => null),
  ]);
  if (session) redirect("/");
  const t = dict[lang].auth;

  return (
    <div className="relative mx-auto flex min-h-[75vh] w-full max-w-md items-center justify-center px-2 sm:px-4 py-8">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

      <Card className="relative w-full overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl transition-all">
        {/* Top subtle brand gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600" />

        <CardHeader className="items-center text-center space-y-3 pt-6 sm:pt-8 pb-4">
          {/* Logo container */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-border/70 p-3 shadow-lg shadow-indigo-500/10 dark:shadow-indigo-500/20">
            <Image
              src="/logo.png"
              alt="TADX Finance"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-0.5 text-xs font-bold tracking-wider text-indigo-500 uppercase" dir="ltr">
              TADX Finance
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              {t.subtitle}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-5 sm:px-8 pb-6 sm:pb-8">
          <Suspense>
            <LoginForm lang={lang} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
