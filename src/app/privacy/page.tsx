import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TADX Finance collects, uses, stores, and protects company financial records and account data, and the rights users hold under GDPR and Egypt Law 151/2020.",
};

// TODO(owner): replace bracketed placeholders with real business details
// (registered name, address, contact email, DPO contact, hosting providers,
// commercial registration / tax card numbers) before any external rollout.
const LAST_UPDATED = "2026-09-13";

const EN_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Controller and contact",
    p: [
      "The data controller is [TADX Company — registered name, address, commercial registration No., tax card No.]. For any privacy request, contact [privacy@tadx.finance — replace with the real contact email].",
      "This policy covers the private TADX Finance ledger (project inflow, expenses, company overhead, partner equity, settlements, treasury custody) and the credentials used to access it.",
    ],
  },
  {
    h: "2. Data we collect (minimization)",
    p: [
      "We collect only what operating the ledger requires: account usernames and salted password hashes; partner names and optional emails; project records, client payments, expenses, bills, payouts, drawings, settlements, and notes entered by the company; session and language-preference records.",
      "Partner email is optional and used for identification only. There is no marketing list, no newsletter, and no behavioral profiling.",
    ],
  },
  {
    h: "3. Purposes and lawful bases",
    p: [
      "Contract / legitimate interest: operating the ledger the company asked for — computing balances, profit shares, custody positions, and settlement suggestions; keeping the service secure (authentication, abuse prevention).",
      "Consent: optional storage such as theme preference, governed by the cookie banner. Consent can be withdrawn at any time via Cookie settings in the footer, with effect for the future.",
      "Legal obligation: retaining records the law requires (see section 6).",
    ],
  },
  {
    h: "4. Cookies and local storage",
    p: [
      "Strictly necessary: `ledger_session` (signed httpOnly session cookie, 7 days), `lang` (UI language, 1 year), `tadx_consent` (consent record, 1 year). These cannot be disabled because the app does not function without them.",
      "Optional: `ledger-theme` (light/dark preference, device only) — stored only after Preferences consent. No analytics or marketing cookies are installed. Full table: see the Cookie Policy.",
    ],
  },
  {
    h: "5. Sharing and processors",
    p: [
      "Data is never sold and never used for advertising. It is shared only with infrastructure required to run the service: [hosting provider, e.g. Vercel] and [database provider, e.g. Supabase/Neon] acting as processors under contract.",
      "No other third parties receive personal data. There are no embedded third-party scripts, pixels, or iframes.",
    ],
  },
  {
    h: "6. Retention",
    p: [
      "Operational records are kept while the company account is active, because the ledger must stay reconcilable. Session cookies expire after 7 days of inactivity.",
      "Deletion of a partner with financial history is blocked to preserve ledger integrity; deactivation is used instead. Statutory retention (e.g. Egyptian tax/commercial record duties, typically 5 years) overrides deletion requests for the affected records.",
    ],
  },
  {
    h: "7. Security",
    p: [
      "Passwords are stored as salted scrypt hashes, never plaintext. Sessions are signed JWTs in httpOnly, SameSite=Lax cookies, Secure in production. All other access requires authentication; public pages are limited to sign-in and legal pages.",
    ],
  },
  {
    h: "8. Your rights",
    p: [
      "Under the GDPR and Egypt Personal Data Protection Law No. 151 of 2020 you may request access, rectification, erasure, restriction, portability, and objection to processing, and withdraw consent at any time. Contact the address in section 1; we respond within 30 days (GDPR) and per the Egyptian Data Protection Center timelines where applicable.",
      "If unresolved, you may complain to your supervisory authority (EU/EEA) or the Egyptian Personal Data Protection Center.",
    ],
  },
  {
    h: "9. International transfers",
    p: [
      "Hosting infrastructure may be located outside Egypt/the EU ([specify regions, e.g. EU + Bahrain]). Transfers rely on contractual safeguards and the strictly-necessary scope of the data.",
    ],
  },
  {
    h: "10. Changes",
    p: [
      "Material changes to this policy are announced in-app before they take effect. Continued use after the effective date constitutes acceptance.",
    ],
  },
];

const AR_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. المتحكم في البيانات والتواصل",
    p: [
      "المتحكم في البيانات هو [شركة TADX — الاسم المسجل والعنوان ورقم السجل التجاري ورقم البطاقة الضريبية]. لأي طلب خصوصية تواصل عبر [privacy@tadx.finance — استبدله بالبريد الحقيقي].",
      "تغطي هذه السياسة دفتر TADX Finance الداخلي (إيرادات المشاريع والمصاريف والمصاريف العمومية ونسب الشركاء والتسويات وحيازة الخزنة) وبيانات الدخول إليه.",
    ],
  },
  {
    h: "2. البيانات التي نجمعها (تقليل البيانات)",
    p: [
      "نجمع فقط ما يلزم لتشغيل الدفتر: أسماء المستخدمين وتجزئات كلمات المرور المملحة؛ أسماء الشركاء وبريدهم الاختياري؛ سجلات المشاريع ومدفوعات العملاء والمصاريف والفواتير والمدفوعات والمسحوبات والتسويات والملاحظات التي تدخلها الشركة؛ وسجلات الجلسات واللغة.",
      "البريد الإلكتروني للشريك اختياري ويستخدم للتعريف فقط. لا توجد قوائم تسويقية ولا تتبع سلوكي.",
    ],
  },
  {
    h: "3. الأغراض والأسس القانونية",
    p: [
      "العقد/المصلحة المشروعة: تشغيل الدفتر المطلوب — حساب الأرصدة وحصص الأرباح ومواضع الحيازة واقتراحات التسوية، وتأمين الخدمة.",
      "الموافقة: التخزين الاختياري مثل تفضيل المظهر عبر لافتة ملفات الارتباط. يمكن سحب الموافقة في أي وقت من إعدادات ملفات الارتباط في التذييل.",
      "الالتزام القانوني: الاحتفاظ بالسجلات التي يفرضها القانون (انظر البند 6).",
    ],
  },
  {
    h: "4. ملفات الارتباط والتخزين المحلي",
    p: [
      "ضرورية: `ledger_session` (جلسة موقعة httpOnly لمدة 7 أيام)، و`lang` (اللغة لمدة سنة)، و`tadx_consent` (سجل الموافقة لمدة سنة). لا يمكن تعطيلها لأن التطبيق لا يعمل بدونها.",
      "اختيارية: `ledger-theme` (المظهر على الجهاز فقط) — يحفظ بعد موافقة التفضيلات. لا توجد ملفات تحليلات أو تسويق. الجدول الكامل في سياسة ملفات الارتباط.",
    ],
  },
  {
    h: "5. المشاركة والمعالجون",
    p: [
      "لا تباع البيانات ولا تستخدم للإعلانات. تشارك فقط مع البنية اللازمة للتشغيل: [مزود الاستضافة] و[مزود قاعدة البيانات] كمعالجين بموجب عقد.",
      "لا تصل أي أطراف أخرى إلى البيانات. لا توجد سكربتات أو بكسلات أو إطارات خارجية مضمنة.",
    ],
  },
  {
    h: "6. الاحتفاظ",
    p: [
      "تحفظ السجلات التشغيلية طالما حساب الشركة نشطا لضمان قابلية التسوية. تنتهي الجلسات بعد 7 أيام من عدم النشاط.",
      "حذف شريك له سجل مالي محظور للحفاظ على سلامة الدفتر ويستخدم الإيقاف بدلا منه. مدد الاحتفاظ القانونية (مثل الالتزامات الضريبية والتجارية المصرية، عادة 5 سنوات) تقدم على طلبات الحذف للسجلات المشمولة.",
    ],
  },
  {
    h: "7. الأمن",
    p: [
      "تحفظ كلمات المرور بتجزئة scrypt مملحة وليست نصا صريحا. الجلسات رموز JWT موقعة في ملفات httpOnly بخاصية SameSite=Lax وSecure في الإنتاج. كل الوصول الآخر يتطلب مصادقة، والصفحات العامة مقتصرة على الدخول والصفحات القانونية.",
    ],
  },
  {
    h: "8. حقوقك",
    p: [
      "بموجب اللائحة العامة لحماية البيانات وقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020 يحق لك طلب الوصول والتصحيح والمحو والتقييد وقابلية النقل والاعتراض وسحب الموافقة في أي وقت. تواصل عبر العنوان في البند 1، ونرد خلال 30 يوما وفق اللائحة ومواعيد مركز حماية البيانات المصري حسب الانطباق.",
      "عند عدم الحل يمكنك الشكوى لسلطة الإشراف المختصة أو لمركز حماية البيانات الشخصية المصري.",
    ],
  },
  {
    h: "9. نقل البيانات دوليا",
    p: [
      "قد تقع بنية الاستضافة خارج مصر/الاتحاد الأوروبي ([حدد المناطق]). تعتمد عمليات النقل على ضمانات تعاقدية وعلى النطاق الضروري للبيانات.",
    ],
  },
  {
    h: "10. التعديلات",
    p: ["التعديلات الجوهرية تعلن داخل التطبيق قبل سريانها. استمرار الاستخدام بعد تاريخ السريان يعد قبولا."],
  },
];

export default async function PrivacyPage() {
  const lang = await getLang();
  const sections = lang === "ar" ? AR_SECTIONS : EN_SECTIONS;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? `آخر تحديث: ${LAST_UPDATED}. دفتر خاص يتطلب تسجيل الدخول.`
            : `Last updated: ${LAST_UPDATED}. A private ledger that requires sign-in.`}{" "}
          <Link href="/cookies" className="underline underline-offset-4">
            {lang === "ar" ? "سياسة ملفات الارتباط" : "Cookie Policy"}
          </Link>
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">TADX Finance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="font-semibold text-foreground">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para.slice(0, 24)} className="mt-1">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
