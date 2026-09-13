"use server";

import { cookies } from "next/headers";
import type { Lang } from "@/lib/format";
import { LANG_COOKIE } from "@/lib/i18n";

/** Persist the UI language in a cookie (read by the root layout on refresh). */
export async function setLang(lang: Lang): Promise<void> {
  if (lang !== "en" && lang !== "ar") throw new Error("Unsupported language");
  (await cookies()).set(LANG_COOKIE, lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    // Strictly-necessary functional cookie (remembers the explicitly chosen
    // UI language). Secure in transit on production; see /cookies for details.
    secure: process.env.NODE_ENV === "production",
  });
}
