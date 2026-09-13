import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms governing access to TADX Finance: responsibilities, acceptable use, liability, termination, governing law, and dispute resolution.",
};

// TODO(owner): replace bracketed placeholders (governing law details, liability
// cap, notice email/addresses) with counsel-approved values before external rollout.
const LAST_UPDATED = "2026-09-13";

const EN_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. The service",
    p: [
      "TADX Finance is a private, authenticated ledger used by one company to record project inflow, project expenses, company overhead, partner equity splits, settlements, drawings, and cash custody. It is an internal record-keeping tool — not a bank, payment processor, auditor, or tax adviser.",
    ],
  },
  {
    h: "2. Accounts and responsibilities",
    p: [
      "Access is by company-issued credentials only; there is no public signup. Administrators are responsible for provisioning and deprovisioning users promptly. Every user must keep credentials confidential, log out on shared devices, and is accountable for all activity under their account.",
      "The company is responsible for the accuracy and completeness of the data it enters, for reviewing computed balances before moving money, and for maintaining its own exports/backups of critical records.",
    ],
  },
  {
    h: "3. Acceptable use",
    p: [
      "Enter complete and truthful records. Do not delete or rewrite history to misrepresent balances, access data beyond your authorization, probe or disrupt the service, or use the service for any unlawful purpose.",
      "Violation may lead to immediate suspension of the account involved.",
    ],
  },
  {
    h: "4. Financial-data disclaimer",
    p: [
      "Balances, entitlements, custody positions, and settlement suggestions are computed from company-entered data. They are operational records — not audited financial statements, valuations, or tax advice. Verify consequential payouts against source documents and consult a qualified professional for accounting or tax decisions.",
    ],
  },
  {
    h: "5. Intellectual property",
    p: [
      "The application, its design, and its code remain the property of [TADX Company]. The company retains full ownership of the business data it enters and may export it at any time while its account is active.",
    ],
  },
  {
    h: "6. Availability and support",
    p: [
      "The service is provided on an as-available basis with no uptime guarantee beyond what a separate written agreement states. Support is provided through [support channel — replace with real channel] during [operating hours — replace with real hours].",
    ],
  },
  {
    h: "7. Limitation of liability",
    p: [
      "To the maximum extent permitted by law, [TADX Company] is not liable for indirect, incidental, or consequential losses arising from use of the service, including losses from inaccurate input data. Direct liability, if any, is capped at [amount/fee basis — to be set by counsel, e.g. fees paid in the preceding 12 months]. Nothing in this section limits liability that cannot be limited by law.",
    ],
  },
  {
    h: "8. Suspension and termination",
    p: [
      "Accounts may be suspended immediately for security reasons or breach of these terms. On termination of the company account, access ends; the company may request an export of its data within [30] days, subject to statutory retention duties.",
    ],
  },
  {
    h: "9. Governing law and disputes",
    p: [
      "These terms are governed by the laws of [the Arab Republic of Egypt — confirm with counsel]. Disputes shall first be negotiated in good faith for [30] days; failing settlement, they are submitted to the competent courts of [Cairo, Egypt — confirm with counsel].",
      "Statutory consumer or labor protections, where mandatorily applicable, are unaffected.",
    ],
  },
  {
    h: "10. Local compliance notices",
    p: [
      "Egyptian commercial and tax compliance: [commercial registration No., tax card No., e-invoicing status — to be completed by the owner]. Electronic records kept in this ledger do not replace statutory books or filings; the company remains responsible for its Egyptian Tax Authority and commercial-registry obligations, including VAT treatment where applicable.",
    ],
  },
  {
    h: "11. Changes and contact",
    p: [
      "Material changes are announced in-app before they take effect; continued use after the effective date constitutes acceptance. Questions about these terms: [legal@tadx.finance — replace with the real contact].",
    ],
  },
];

const AR_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. الخدمة",
    p: [
      "نظام TADX Finance دفتر داخلي خاص يتطلب مصادقة، تستخدمه شركة واحدة لتسجيل إيرادات المشاريع ومصاريفها والمصاريف العمومية ونسب الشركاء والتسويات والمسحوبات وحيازة النقدية. هو أداة تسجيل داخلية — وليس بنكا أو معالج مدفوعات أو مدققا أو مستشارا ضريبيا.",
    ],
  },
  {
    h: "2. الحسابات والمسؤوليات",
    p: [
      "الوصول ببيانات اعتماد تصدرها الشركة فقط ولا يوجد تسجيل عام. الإداريون مسؤولون عن إنشاء الحسابات وإيقافها فورا عند اللزوم. كل مستخدم مسؤول عن سرية بياناته وتسجيل الخروج على الأجهزة المشتركة وعن كل نشاط عبر حسابه.",
      "الشركة مسؤولة عن دقة واكتمال البيانات المدخلة ومراجعة الأرصدة المحسوبة قبل أي تحويل نقدي والاحتفاظ بنسخ وصادرات لسجلاتها المهمة.",
    ],
  },
  {
    h: "3. الاستخدام المقبول",
    p: [
      "أدخل سجلات كاملة وصحيحة. لا تحذف السجل أو تعيد كتابته بما يشوه الأرصدة، ولا تصل لبيانات خارج صلاحياتك، ولا تعطل الخدمة أو تسيء استخدامها لأي غرض غير مشروع.",
      "يجوز إيقاف الحساب المخالف فورا.",
    ],
  },
  {
    h: "4. إخلاء مسؤولية البيانات المالية",
    p: [
      "الأرصدة والاستحقاقات ومواضع الحيازة واقتراحات التسوية محسوبة من بيانات أدخلتها الشركة. هي سجلات تشغيلية — وليست قوائم مدققة أو تقييما أو استشارة ضريبية. راجع المستندات الأصلية قبل أي مدفوعات مؤثرة واستشر مختصا مؤهلا للقرارات المحاسبية والضريبية.",
    ],
  },
  {
    h: "5. الملكية الفكرية",
    p: [
      "التطبيق وتصميمه وشفرته ملك [شركة TADX]. وتحتفظ الشركة بملكية كاملة لبيانات أعمالها المدخلة ويجوز لها تصديرها في أي وقت طالما حسابها نشط.",
    ],
  },
  {
    h: "6. الإتاحة والدعم",
    p: [
      "الخدمة مقدمة حسب الإتاحة دون ضمان استمرارية يتجاوز ما ينص عليه اتفاق مكتوب منفصل. الدعم عبر [قناة الدعم — استبدلها بالقناة الحقيقية] خلال [ساعات العمل — استبدلها بالساعات الحقيقية].",
    ],
  },
  {
    h: "7. حدود المسؤولية",
    p: [
      "إلى أقصى حد يسمح به القانون، لا تسأل [شركة TADX] عن الأضرار غير المباشرة أو التبعية الناشئة عن استخدام الخدمة بما فيها الخسائر الناتجة عن بيانات مدخلة غير دقيقة. المسؤولية المباشرة — إن وجدت — بحد أقصى [المبلغ/الأساس — يحدد بمراجعة قانونية]. لا يحد هذا البند من أي مسؤولية لا يجوز تحديدها قانونا.",
    ],
  },
  {
    h: "8. الإيقاف والإنهاء",
    p: [
      "يجوز إيقاف الحسابات فورا لأسباب أمنية أو لمخالفة هذه الشروط. عند إنهاء حساب الشركة ينتهي الوصول، ويجوز للشركة طلب تصدير بياناتها خلال [30] يوما مع مراعاة واجبات الاحتفاظ القانونية.",
    ],
  },
  {
    h: "9. القانون الحاكم والمنازعات",
    p: [
      "تخضع هذه الشروط لقوانين [جمهورية مصر العربية — تأكد بمراجعة قانونية]. تحل المنازعات أولا بالتفاوض بحسن نية لمدة [30] يوما، وعند تعذره تختص المحاكم المختصة في [القاهرة، مصر — تأكد بمراجعة قانونية].",
      "لا تمس هذه الشروط أي حماية آمرة للمستهلك أو العمل حيثما انطبقت.",
    ],
  },
  {
    h: "10. إشعارات الامتثال المحلية",
    p: [
      "الامتثال التجاري والضريبي المصري: [رقم السجل التجاري ورقم البطاقة الضريبية وموقف الفاتورة الإلكترونية — يستكملها المالك]. السجلات الإلكترونية في هذا الدفتر لا تغني عن الدفاتر والإقرارات النظامية، وتبقى الشركة مسؤولة عن التزاماتها أمام مصلحة الضرائب والسجل التجاري بما فيها المعاملة الضريبية وضريبة القيمة المضافة حيثما انطبقت.",
    ],
  },
  {
    h: "11. التعديلات والتواصل",
    p: [
      "التعديلات الجوهرية تعلن داخل التطبيق قبل سريانها واستمرار الاستخدام بعد تاريخ السريان يعد قبولا. للاستفسار: [legal@tadx.finance — استبدله بالبريد الحقيقي].",
    ],
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
            ? `آخر تحديث: ${LAST_UPDATED}. تحكم استخدام دفتر الشركة الداخلي.`
            : `Last updated: ${LAST_UPDATED}. Governs use of the internal company ledger.`}{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            {lang === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
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
