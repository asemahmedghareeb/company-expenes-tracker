import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
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
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/25">
            <Wallet className="h-6 w-6" />
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
