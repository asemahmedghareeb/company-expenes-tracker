import { cookies } from "next/headers";
import type { Lang } from "./format";

export type { Lang };
export { dict, type Dictionary } from "./dict";

export const isRTL = (lang: Lang): boolean => lang === "ar";

export const LANG_COOKIE = "lang";

/** Resolve the current language from the `lang` cookie (server only). */
export async function getLang(): Promise<Lang> {
  try {
    const value = (await cookies()).get(LANG_COOKIE)?.value;
    return value === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}
