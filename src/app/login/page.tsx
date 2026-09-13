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
  title: "Sign in | TADX Finance",
  description:
    "Sign in to TADX Finance, the private company ledger for project expenses, partner settlements, and treasury custody.",
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
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-2 sm:px-4 py-2 sm:py-4">
      <Card className="relative w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg">
        {/* Top brand bar */}
        <div className="h-1 w-full bg-primary" />

        <CardHeader className="items-center text-center space-y-2.5 pt-5 sm:pt-6 pb-3 sm:pb-4">
          {/* Logo container */}
          <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-xl bg-card border border-border/70 p-2.5 shadow-sm">
            <Image
              src="/logo.png"
              alt="TADX Finance"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase" dir="ltr">
              TADX Finance
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.title}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
              {t.subtitle}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-5 sm:px-8 pb-5 sm:pb-6">
          <Suspense>
            <LoginForm lang={lang} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Built by TADX Company Badge */}
      <div className="mt-3 text-center">
        <p className="text-xs font-medium text-muted-foreground/80 hover:text-foreground transition-colors">
          {dict[lang].builtBy}
        </p>
      </div>
    </div>
  );
}
