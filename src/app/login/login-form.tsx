"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, type LoginState } from "@/actions/auth";
import type { Lang } from "@/lib/format";
import { dict } from "@/lib/dict";

const INVALID_MSG = "Invalid username or password.";
const REQUIRED_MSG = "Enter your username and password.";

/** Credential form — posts to the `login` server action (sets httpOnly JWT cookie). */
export function LoginForm({ lang }: { lang: Lang }) {
  const t = dict[lang].auth;
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {
    ok: false,
  });

  const error =
    state.error === INVALID_MSG
      ? t.invalid
      : state.error === REQUIRED_MSG || !state.error
        ? null
        : state.error.includes("misconfigured")
          ? t.unavailable
          : state.error;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          {t.username}
        </label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          required
          maxLength={64}
          autoFocus
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t.password}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <LogIn className="h-4 w-4" />
        {pending ? t.signingIn : t.signIn}
      </Button>
    </form>
  );
}
