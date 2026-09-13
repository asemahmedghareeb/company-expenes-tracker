import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TADX Finance handles company financial records, credentials, and operational data in a private authenticated ledger.",
};

const EN_SECTIONS = [
  {
    h: "1. Data we store",
    p: "Project records, client payments, expenses, partner profiles and equity splits, settlements, drawings, company bills, and login session data. We store only what the company enters to operate the ledger.",
  },
  {
    h: "2. How data is used",
    p: "Data is used solely to compute balances, profit shares, custody positions, and settlement suggestions for the company. It is never sold, never used for advertising, and never shared with third parties except infrastructure hosting required to run the service.",
  },
  {
    h: "3. Credentials and sessions",
    p: "Passwords are stored as salted hashes. Sessions use signed httpOnly cookies. Users should log out on shared devices.",
  },
  {
    h: "4. Retention and deletion",
    p: "Records are retained while the company account is active. The company may request export or deletion of its data. Deletion of partners with financial history is blocked to preserve ledger integrity; deactivation is used instead.",
  },
  {
    h: "5. Contact",
    p: "For access, export, or deletion requests, contact the company administrator who provisioned your account.",
  },
];

const AR_SECTIONS = [
  {
    h: "1. البيانات المخزنة",
    p: "سجلات المشاريع ومدفوعات العملاء والمصاريف وبيانات الشركاء ونسبهم والتسويات والمسحوبات وفواتير الشركة وبيانات جلسات الدخول. نخزن فقط ما تدخله الشركة لتشغيل الدفتر.",
  },
  {
    h: "2. استخدام البيانات",
    p: "تستخدم البيانات فقط لحساب الأرصدة وحصص الأرباح ومواضع الحيازة واقتراحات التسوية الخاصة بالشركة. لا تباع ولا تستخدم للإعلانات ولا تشارك مع أطراف خارجية إلا بنية الاستضافة اللازمة لتشغيل الخدمة.",
  },
  {
    h: "3. بيانات الاعتماد والجلسات",
    p: "تحفظ كلمات المرور بصيغة تجزئة مملحة. الجلسات عبر ملفات تعريف ارتباط موقعة من نوع httpOnly. سجل الخروج على الأجهزة المشتركة.",
  },
  {
    h: "4. الاحتفاظ والحذف",
    p: "تحتفظ السجلات طالما حساب الشركة نشط. يجوز للشركة طلب تصدير بياناتها أو حذفها. حذف شريك له سجل مالي محظور للحفاظ على سلامة الدفتر، ويستخدم الإيقاف بدلا من ذلك.",
  },
  {
    h: "5. التواصل",
    p: "لطلبات الوصول أو التصدير أو الحذف، تواصل مع مدير الشركة الذي أنشأ حسابك.",
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
            ? "آخر تحديث: 2026. دفتر خاص يتطلب تسجيل الدخول."
            : "Last updated: 2026. A private ledger that requires sign-in."}
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
              <p className="mt-1">{s.p}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
