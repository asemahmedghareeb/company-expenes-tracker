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
                <span>−{formatEGP(l.totalDrawings, lang)}</span>
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
                    <TableCell>{e.project.name}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle>{t.formulaTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant="warning">{t.fPending}</Badge>
          <Badge variant="secondary">{t.fProfit}</Badge>
          <Badge variant="outline">{t.fBalance}</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
