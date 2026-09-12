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
  title: "Sign in",
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
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md items-center">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/70 p-2.5 shadow-md">
            <Image
              src="/logo.webp"
              alt="TADX Finance"
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <CardTitle className="text-2xl">{t.title}</CardTitle>
          <CardDescription>{t.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm lang={lang} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
