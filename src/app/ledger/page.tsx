import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatEGP, formatPct } from "@/lib/format";
import { dict, getLang } from "@/lib/i18n";
import { getLedgerData, getPartners } from "@/actions/queries";
import { DeleteDrawingButton, DrawingForm } from "@/components/forms/transaction-forms";
import { PageGuide } from "@/components/ui/page-guide";

// Cached by default — mutations revalidate on demand via revalidatePath().

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return {
    title: lang === "ar" ? "دفتر الشركاء" : "Partner Ledger",
  };
}

export default async function LedgerPage() {
  const lang = await getLang();
  const t = dict[lang].ledger;

  const [data, partners] = await Promise.all([
    getLedgerData().catch(() => null),
    getPartners().catch(() => []),
  ]);

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.unavailable}</CardTitle>
          <CardDescription>{t.unavailableDesc}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { ledgers, drawings, pendingExpenses } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ledgers.map((l) => (
          <Card key={l.partnerId}>
            <CardHeader className="pb-2">
              <CardDescription>{l.partnerName}</CardDescription>
              <CardTitle
                className={`text-2xl ${l.balance < 0 ? "text-red-600" : "text-emerald-700"}`}
              >
                {formatEGP(l.balance, lang)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.pendingShort}</span>
                <span>{formatEGP(l.pendingReimbursements, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.profitShare}</span>
                <span>{formatEGP(l.realizedProfitShare, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.companyNet}</span>
                <span>{formatEGP(l.companyNet, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.drawings}</span>
                <span>
                  {l.totalDrawings > 0 ? `−${formatEGP(l.totalDrawings, lang)}` : formatEGP(0, lang)}
                </span>
              </div>
              {(l.breakdown.length > 0 || l.companyBreakdown.length > 0) && (
                <div className="pt-2">
                  {l.breakdown.map((b) => (
                    <div
                      key={b.projectId}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>
                        {b.projectName ?? b.projectId.slice(0, 8)} ({formatPct(b.sharePercentage)})
                      </span>
                      <span>{formatEGP(b.totalOwed, lang)}</span>
                    </div>
                  ))}
                  {l.companyBreakdown.map((c) => (
                    <div
                      key={c.expenseId}
                      className="flex justify-between text-xs text-muted-foreground"
                    >
                      <span>{c.title ?? c.expenseId.slice(0, 8)}</span>
                      <span>{formatEGP(c.net, lang)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {ledgers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t.noPartners}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.recordTitle}</CardTitle>
            <CardDescription>{t.recordDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <DrawingForm
              lang={lang}
              partners={partners.map((p) => ({ id: p.id, name: p.name }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.pendingTitle}</CardTitle>
            <CardDescription>{t.pendingDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colProject}</TableHead>
                  <TableHead>{t.colPartner}</TableHead>
                  <TableHead className="text-end">{t.colAmount}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingExpenses.slice(0, 10).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.project?.name ?? "—"}</TableCell>
                    <TableCell>{e.paidBy?.name ?? "—"}</TableCell>
                    <TableCell className="text-end">
                      {formatEGP(Number(e.amount), lang)}
                    </TableCell>
                  </TableRow>
                ))}
                {pendingExpenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      {t.allSettled}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.colDate}</TableHead>
                <TableHead>{t.colPartner}</TableHead>
                <TableHead>{t.colNotes}</TableHead>
                <TableHead className="text-end">{t.colAmount}</TableHead>
                <TableHead className="text-end">{t.colAction}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawings.slice(0, 20).map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{formatDate(d.drawnAt, lang)}</TableCell>
                  <TableCell className="font-medium">{d.partner.name}</TableCell>
                  <TableCell className="text-muted-foreground">{d.notes ?? "—"}</TableCell>
                  <TableCell className="text-end">
                    {formatEGP(Number(d.amount), lang)}
                  </TableCell>
                  <TableCell className="text-end">
                    <DeleteDrawingButton id={d.id} lang={lang} />
                  </TableCell>
                </TableRow>
              ))}
              {drawings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t.noDrawings}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل حسابات دفتر الشركاء والمسحوبات" : "Partner Ledger & Drawings Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لتفسير رصيد كل شريك والمعادلات المطبقة بدقة"
            : "Official accounting reference explaining partner balances and exact equations"
        }
        steps={[
          {
            title: lang === "ar" ? "المستحقات المعلقة (دفعات من الجيب)" : "Pending Reimbursements",
            text:
              lang === "ar"
                ? "أي مصروف دفعه الشريك من ماله الخاص لصالح مشروع أو مصاريف الشركة دون أن يتم رده له بعد، فيُحسب كدين على الشركة للشريك."
                : "Expenses paid by the partner out-of-pocket for projects or company costs not yet reimbursed.",
            badge: { text: lang === "ar" ? "مستحق للشريك (+)" : "Owed to Partner (+)", variant: "outline" },
          },
          {
            title: lang === "ar" ? "حصص الأرباح المحققة" : "Realized Profit Shares",
            text:
              lang === "ar"
                ? "نصيب الشريك المتفق عليه من صافي أرباح المشاريع بعد سداد تكاليفها وتحصيل دفعات العميل فعلياً."
                : "Partner's contractual share of net project profits after deducting project expenses from received client cash.",
            badge: { text: lang === "ar" ? "أرباح مضافة (+)" : "Added Profit (+)", variant: "success" },
          },
          {
            title: lang === "ar" ? "صافي الشركة" : "Company Net",
            text:
              lang === "ar"
                ? "نصيب الشريك في صافي تكاليف الشركة العامة المشتركة (كالإيجار والاشتراكات) بعد خصم ما دفعه."
                : "Partner's share of company general overhead after accounting for their contributions.",
          },
          {
            title: lang === "ar" ? "المسحوبات (تسجيل مسحوبات)" : "Drawings (تسجيل مسحوبات)",
            text:
              lang === "ar"
                ? "أي سحب كاش نقدي يقوم به الشريك من رصيده أو أرباحه المتاحة بالشركة لاستخدامه الخاص. يُسجل عبر نموذج «تسجيل مسحوبات» بالأسفل ويُخصم مباشرة من رصيده."
                : "Cash drawn by the partner from their available company funds or profits for personal use, deducted from balance.",
            badge: { text: lang === "ar" ? "يخصم من الرصيد (−)" : "Deducted (−)", variant: "destructive" },
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "المعادلة المحاسبية المعتمدة لرصيد الشريك (Source of Truth)" : "Official Partner Balance Equation",
            formula:
              lang === "ar"
                ? "الرصيد النهائي = المستحقات المعلقة + حصص الأرباح المحققة + صافي الشركة − إجمالي المسحوبات"
                : "Balance = Pending Reimbursements + Realized Profit Shares + Company Net − Total Drawings",
            explanation:
              lang === "ar"
                ? "الرصيد الأخضر (+) يعني أن الشركة مدينة للشريك بهذا المبلغ ويمكنه سحبه، والرصيد الأحمر (−) يعني أن الشريك سحب مبالغ تفوق مستحقاته وعليه سدادها للشركة."
                : "Positive balance (green) means company owes the partner; negative (red) means partner over-withdrew.",
          },
        ]}
        tips={[
          lang === "ar"
            ? "نموذج «تسجيل مسحوبات»: يُستخدم حصراً عندما يستلم الشريك كاش حقيقي من الشركة كأرباح أو استرداد رصيد."
            : "Drawings form: Use exclusively when a partner withdraws actual cash from company reserves.",
          lang === "ar"
            ? "لا يتم تسجيل دفعات العملاء أو مصاريف المشاريع كمسحوبات، بل تسجل في صفحات المشاريع الخاصة بها."
            : "Client payments and project direct expenses are managed in project pages, not as drawings.",
        ]}
      />
    </div>
  );
}
