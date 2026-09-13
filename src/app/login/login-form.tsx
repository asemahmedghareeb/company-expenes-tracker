"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn, Loader2, User, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <form action={action} className="space-y-4 sm:space-y-5">
      <input type="hidden" name="next" value={next} />

      {/* Username Field */}
      <div className="space-y-2">
        <label htmlFor="username" className="text-xs sm:text-sm font-semibold text-foreground/90">
          {t.username}
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            <User className="h-4 w-4" />
          </span>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            required
            maxLength={64}
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="h-11 ps-10 pe-3.5 text-sm rounded-xl border-border/80 bg-background/70 transition-all focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
          />
        </div>
      </div>

      {/* Password Field with Eye Toggle */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-xs sm:text-sm font-semibold text-foreground/90">
          {t.password}
        </label>
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70">
            <Lock className="h-4 w-4" />
          </span>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="h-11 ps-10 pe-11 text-sm rounded-xl border-border/80 bg-background/70 transition-all focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? t.hidePassword : t.showPassword}
            title={showPassword ? t.hidePassword : t.showPassword}
            className="absolute end-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id="login-error" role="alert" className="rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs sm:text-sm text-destructive font-medium">
          {error}
        </p>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm hover:brightness-110"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>{t.signingIn}</span>
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" aria-hidden />
            <span>{t.signIn}</span>
          </>
        )}
      </Button>

      {/* Security Note */}
      <div className="pt-2 text-center">
        <div className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span>{t.securityNote}</span>
        </div>
      </div>
    </form>
  );
}
