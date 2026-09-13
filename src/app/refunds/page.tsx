import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Refunds and Corrections Policy",
  description:
    "How corrections, reversals, and (where applicable) refunds are handled in the TADX Finance ledger.",
};

// TODO(owner): if paid plans are ever introduced, replace section 3 with the
// real billing terms (price, cycle, 14-day withdrawal handling, proration)
// and the support channel in section 4.
const LAST_UPDATED = "2026-09-13";

const EN_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Scope",
    p: [
      "TADX Finance is an internal company ledger. There is no public checkout, no online sale of goods, and no consumer payment flow in the application today — so there is nothing to return and no card payment to refund.",
      "What the ledger does record is money movement between clients, the company, and partners. Errors in those records are handled as corrections (section 2), not purchases.",
    ],
  },
  {
    h: "2. Corrections instead of refunds",
    p: [
      "Wrong expense, payout, drawing, or settlement entry: an authorized user voids or reverses the entry with a note, and the corrected entry is recorded alongside it. History is never silently rewritten, so every correction stays auditable.",
      "Duplicate or misattributed client payment: the custody allocation is corrected to the right project/partner, and any downstream settlement computed from it is re-run.",
      "Cash already handed to a partner is recovered operationally (offset against the next settlement), not through an in-app refund flow.",
    ],
  },
  {
    h: "3. If paid plans are introduced",
    p: [
      "Template (inactive until published with real terms): subscription fees are billed per the plan shown at signup. Statutory withdrawal rights, if applicable to the buyer, are honored as required by law; contact support within 14 days of purchase. Approved refunds return to the original payment method within 14 days of approval. No partial refunds for partially used periods unless stated in the plan terms.",
    ],
  },
  {
    h: "4. How to request a correction",
    p: [
      "Contact your company administrator or [support@tadx.finance — replace with the real channel] with the entry date, amount, project or bill name, and what is wrong. Valid correction requests are actioned within [5] business days.",
    ],
  },
];

const AR_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. النطاق",
    p: [
      "نظام TADX Finance دفتر داخلي للشركة. لا يوجد دفع إلكتروني عام ولا بيع سلع ولا مدفوعات استهلاكية داخل التطبيق حاليا — فلا يوجد ما يسترجع ولا مدفوعة بطاقة تسترد.",
      "ما يسجله الدفتر هو حركة الأموال بين العملاء والشركة والشركاء. الأخطاء في تلك السجلات تعالج كتصحيحات (البند 2) وليست مشتريات.",
    ],
  },
  {
    h: "2. التصحيحات بدلا من الاسترداد",
    p: [
      "قيد مصروف أو مدفوعة أو مسحوب أو تسوية خاطئ: يلغي المستخدم المخول القيد أو يعكسه مع ملاحظة، ويسجل القيد المصحح بجواره. لا يعاد كتابة السجل بصمت ليبقى كل تصحيح قابلا للتدقيق.",
      "دفعة عميل مكررة أو منسوبة خطأ: يصحح توزيع الحيازة للمشروع/الشريك الصحيح، وتشغل أي تسوية لاحقة من جديد.",
      "النقدية المسلمة فعلا لشريك تسترد تشغيليا (بالمقاصة مع التسوية التالية) وليس عبر تدفق استرداد داخل التطبيق.",
    ],
  },
  {
    h: "3. عند إطلاق خطط مدفوعة",
    p: [
      "نموذج (غير مفعل حتى ينشر بشروط حقيقية): رسوم الاشتراك وفق الخطة المعروضة عند التسجيل. حقوق العدول النظامية — حيثما انطبقت على المشتري — تحترم وفق القانون، بالتواصل مع الدعم خلال 14 يوما من الشراء. الاستردادات المعتمدة تعود لوسيلة الدفع الأصلية خلال 14 يوما من الاعتماد. لا استرداد جزئي للمدد المستخدمة جزئيا إلا إذا نصت شروط الخطة.",
    ],
  },
  {
    h: "4. طلب تصحيح",
    p: [
      "تواصل مع مدير الشركة أو عبر [support@tadx.finance — استبدله بالقناة الحقيقية] مع ذكر تاريخ القيد والمبلغ واسم المشروع أو الفاتورة وموضع الخطأ. طلبات التصحيح المستحقة تنفذ خلال [5] أيام عمل.",
    ],
  },
];

export default async function RefundsPage() {
  const lang = await getLang();
  const sections = lang === "ar" ? AR_SECTIONS : EN_SECTIONS;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {lang === "ar" ? "سياسة الاسترداد والتصحيح" : "Refunds and Corrections Policy"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? `آخر تحديث: ${LAST_UPDATED}.`
            : `Last updated: ${LAST_UPDATED}.`}{" "}
          <Link href="/terms" className="underline underline-offset-4">
            {lang === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
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
