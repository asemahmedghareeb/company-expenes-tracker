import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Which cookies and local storage TADX Finance uses, why each is needed, how long it lasts, and how to change consent.",
};

// TODO(owner): update the processor/region rows if hosting changes.
const LAST_UPDATED = "2026-09-13";

interface Row {
  name: string;
  purpose: string;
  expiry: string;
  type: string;
}

const EN_ESSENTIAL: Row[] = [
  { name: "`ledger_session`", purpose: "Keeps you signed in (signed httpOnly cookie).", expiry: "7 days", type: "Essential" },
  { name: "`lang`", purpose: "Remembers the UI language you explicitly chose.", expiry: "1 year", type: "Essential" },
  { name: "`tadx_consent`", purpose: "Records your cookie choices from the banner.", expiry: "1 year", type: "Essential" },
];

const EN_OPTIONAL: Row[] = [
  { name: "`ledger-theme` (localStorage)", purpose: "Remembers light/dark theme on this device.", expiry: "Until cleared; only set with Preferences consent", type: "Preferences" },
  { name: "Analytics / marketing", purpose: "None installed. No third-party scripts, pixels, or iframes run on this app.", expiry: "N/A", type: "Not used" },
];

const AR_ESSENTIAL: Row[] = [
  { name: "`ledger_session`", purpose: "لإبقاء تسجيل الدخول (ملف موقع httpOnly).", expiry: "7 أيام", type: "ضرورية" },
  { name: "`lang`", purpose: "لتذكر لغة الواجهة التي اخترتها.", expiry: "سنة", type: "ضرورية" },
  { name: "`tadx_consent`", purpose: "لتسجيل اختياراتك في لافتة ملفات الارتباط.", expiry: "سنة", type: "ضرورية" },
];

const AR_OPTIONAL: Row[] = [
  { name: "`ledger-theme` (تخزين محلي)", purpose: "لتذكر المظهر الفاتح/الداكن على هذا الجهاز.", expiry: "حتى المسح، ويحفظ فقط بموافقة التفضيلات", type: "تفضيلات" },
  { name: "التحليلات/التسويق", purpose: "غير مستخدمة. لا تعمل أي سكربتات أو بكسلات خارجية في هذا التطبيق.", expiry: "لا ينطبق", type: "غير مستخدمة" },
];

function CookieTable({ rows, head }: { rows: Row[]; head: string[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-start">
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-start font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-foreground">{r.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.purpose}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.expiry}</td>
              <td className="px-3 py-2 text-muted-foreground">{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CookiesPage() {
  const lang = await getLang();
  const isAr = lang === "ar";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAr ? "سياسة ملفات الارتباط" : "Cookie Policy"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr
            ? `آخر تحديث: ${LAST_UPDATED}. غيّر موافقتك في أي وقت من زر إعدادات ملفات الارتباط في التذييل.`
            : `Last updated: ${LAST_UPDATED}. Change your consent anytime via Cookie settings in the footer.`}{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAr ? "الضرورية دائما" : "Strictly necessary"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CookieTable
            rows={isAr ? AR_ESSENTIAL : EN_ESSENTIAL}
            head={isAr ? ["الاسم", "الغرض", "المدة", "الفئة"] : ["Name", "Purpose", "Expiry", "Category"]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{isAr ? "الاختيارية" : "Optional"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CookieTable
            rows={isAr ? AR_OPTIONAL : EN_OPTIONAL}
            head={isAr ? ["الاسم", "الغرض", "المدة", "الفئة"] : ["Name", "Purpose", "Expiry", "Category"]}
          />
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {isAr
              ? "سحب موافقة التفضيلات يحذف تفضيل المظهر المحفوظ فورا. رفض التحليلات لا يغير شيئا حاليا لعدم وجود سكربتات تحليلات."
              : "Withdrawing Preferences consent deletes the stored theme immediately. Rejecting Analytics changes nothing today because no analytics scripts exist."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
