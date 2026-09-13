import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms governing access to TADX Finance, a private company ledger for project expenses, partner settlements, and treasury custody.",
};

const EN_SECTIONS = [
  {
    h: "1. What this service is",
    p: "TADX Finance is a private, authenticated ledger used by one company to record project inflow, project expenses, company overhead, partner equity splits, settlements, and cash custody. It is an internal record-keeping tool, not a bank, payment processor, or public accounting service.",
  },
  {
    h: "2. Access",
    p: "Access is by company-issued credentials only. Accounts are not self-serve and may be suspended at any time. You are responsible for keeping your credentials confidential and for all activity under your account.",
  },
  {
    h: "3. Acceptable use",
    p: "Enter complete and truthful records. Do not delete or alter history to misrepresent balances. Do not attempt to access data beyond your authorization, probe other tenants, or interfere with the service.",
  },
  {
    h: "4. Financial records",
    p: "Figures shown (balances, entitlements, custody, settlement suggestions) are computed from data entered by the company. They are operational records, not audited financial statements or tax advice. Verify consequential payouts against source documents before transferring funds.",
  },
  {
    h: "5. Availability and backups",
    p: "The service is provided as-is with no uptime guarantee. The company is responsible for maintaining its own backups and exports of critical records.",
  },
  {
    h: "6. Changes",
    p: "These terms may be updated as the product evolves. Continued use after an update constitutes acceptance of the revised terms.",
  },
];

const AR_SECTIONS = [
  {
    h: "1. ما هي هذه الخدمة",
    p: "نظام TADX Finance هو دفتر داخلي خاص بالشركة لتسجيل إيرادات المشاريع ومصاريفها والمصاريف العمومية ونسب الشركاء والتسويات وحيازة النقدية. هو أداة تسجيل داخلية وليس بنكا أو معالج مدفوعات أو خدمة محاسبة عامة.",
  },
  {
    h: "2. الوصول",
    p: "الوصول مقتصر على بيانات اعتماد تصدرها الشركة. لا يوجد تسجيل ذاتي، ويجوز إيقاف أي حساب في أي وقت. أنت مسؤول عن سرية بياناتك وعن كل نشاط يتم عبر حسابك.",
  },
  {
    h: "3. الاستخدام المقبول",
    p: "أدخل سجلات كاملة وصحيحة. لا تحذف السجل التاريخي أو تعدله بما يشوه الأرصدة. لا تحاول الوصول إلى بيانات خارج صلاحياتك أو الإضرار بالخدمة.",
  },
  {
    h: "4. السجلات المالية",
    p: "الأرقام المعروضة (الأرصدة والاستحقاقات والحيازة واقتراحات التسوية) محسوبة من بيانات أدخلتها الشركة. هي سجلات تشغيلية وليست قوائم مالية مدققة أو استشارة ضريبية. راجع المستندات الأصلية قبل أي تحويل نقدي مؤثر.",
  },
  {
    h: "5. الإتاحة والنسخ الاحتياطي",
    p: "الخدمة مقدمة كما هي دون ضمان استمرارية. الشركة مسؤولة عن الاحتفاظ بنسخ احتياطية وصادرات لسجلاتها المهمة.",
  },
  {
    h: "6. التعديلات",
    p: "قد تحدث هذه الشروط مع تطور المنتج. استمرار الاستخدام بعد التحديث يعد قبولا للشروط المعدلة.",
  },
];

export default async function TermsPage() {
  const lang = await getLang();
  const sections = lang === "ar" ? AR_SECTIONS : EN_SECTIONS;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {lang === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "آخر تحديث: 2026. تحكم استخدام دفتر الشركة الداخلي."
            : "Last updated: 2026. Governs use of the internal company ledger."}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {lang === "ar" ? "TADX Finance" : "TADX Finance"}
          </CardTitle>
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
