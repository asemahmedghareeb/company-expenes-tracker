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
import { getCompanyExpenseSettlement, toNumber } from "@/lib/ledger";
import { sharesSumTo100 } from "@/lib/shares";
import { getCompanyData } from "@/actions/queries";
import {
  CompanyExpenseForm,
  CompanyPaymentForm,
  CompanyPayoutForm,
  DeleteCompanyExpenseButton,
  DeleteCompanyPaymentButton,
  DeleteCompanyPayoutButton,
  FixedCostsManager,
  SettleBillButton,
  SettleRowButton,
} from "@/components/forms/company-forms";

// Cached by default — mutations revalidate on demand via revalidatePath().

export default async function CompanyPage() {
  const lang = await getLang();
  const t = dict[lang].company;
  const { expenses, partners, fixedCosts, payouts } =
    await getCompanyData().catch(() => ({
      expenses: [],
      partners: [],
      fixedCosts: [],
      payouts: [],
    }));

  const active = partners.filter((p) => p.isActive);
  const defaultsOk =
    active.length === 0 ||
    sharesSumTo100(active.map((p) => p.defaultSharePercentage));

  const companyPartners = partners.map((p) => ({
    id: p.id,
    name: p.name,
    defaultSharePercentage: p.defaultSharePercentage,
    isActive: p.isActive,
  }));

  const settlements = expenses.map((e) =>
    getCompanyExpenseSettlement(
      {
        id: e.id,
        title: e.title,
        amount: toNumber(e.amount),
        payments: e.payments.map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
        })),
        payouts: e.payouts.map((x) => ({
          partnerId: x.partnerId,
          amount: toNumber(x.amount),
          expenseId: x.expenseId ?? undefined,
        })),
      },
      companyPartners,
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {!defaultsOk && active.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <CardContent className="pt-6 text-sm text-amber-800 dark:text-amber-200">
            {t.warnDefaults}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3 min-w-0">
        <div className="space-y-6 lg:col-span-1 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.addTitle}</CardTitle>
              <CardDescription>{t.addDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyExpenseForm
                lang={lang}
                partners={partners}
                fixedCosts={fixedCosts.map((f) => ({
                  id: f.id,
                  title: f.title,
                  amount: toNumber(f.amount),
                }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.fixedTitle}</CardTitle>
              <CardDescription>{t.fixedDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <FixedCostsManager
                lang={lang}
                fixedCosts={fixedCosts.map((f) => ({
                  id: f.id,
                  title: f.title,
                  amount: toNumber(f.amount),
                }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.payoutTitle}</CardTitle>
              <CardDescription>{t.payoutDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyPayoutForm
                lang={lang}
                partners={partners.map((p) => ({ id: p.id, name: p.name }))}
                expenses={expenses.map((e) => ({ id: e.id, title: e.title }))}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle>{t.payoutHistory}</CardTitle>
              <CardDescription>{t.payoutHistoryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {payouts.map((x) => (
                <div
                  key={x.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {x.partner.name} · {formatEGP(Number(x.amount), lang)}
                    {x.expense && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {t.payoutTo} {x.expense.title}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatDate(x.paidAt, lang)}
                    </span>
                  </span>
                  <DeleteCompanyPayoutButton id={x.id} lang={lang} />
                </div>
              ))}
              {payouts.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noPayouts}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2 min-w-0">
          {settlements.map((s, i) => {
            const expense = expenses[i]!;
            return (
              <Card key={s.expenseId} className="min-w-0 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      <span>{s.title} · {formatEGP(s.amount, lang)}</span>
                      <Badge variant="outline">
                        {expense.kind === "FIXED"
                          ? dict[lang].summary.kindFixed
                          : dict[lang].summary.kindVariable}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatDate(expense.expenseDate, lang)} · {t.collected}{" "}
                      {formatEGP(s.totalPaid, lang)} · {t.remaining}{" "}
                      {formatEGP(s.remaining, lang)}
                      {s.totalPayout > 0 && (
                        <>
                          {" "}· {t.colPayout}: {formatEGP(s.totalPayout, lang)}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SettleBillButton
                      expenseId={s.expenseId}
                      hasOutstanding={s.rows.some((r) => Math.abs(r.net) >= 0.005)}
                      lang={lang}
                    />
                    <DeleteCompanyExpenseButton id={s.expenseId} lang={lang} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 min-w-0">
                  {/* Mobile settlement cards */}
                  <div className="space-y-2.5 sm:hidden">
                    {s.rows.map((r) => (
                      <div
                        key={r.partnerId}
                        className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                              {r.name.slice(0, 1).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-semibold block">{r.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatPct(r.sharePercentage)} ({formatEGP(r.shareAmount, lang)})
                              </span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              r.net > 0
                                ? "success"
                                : r.net < 0
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {formatEGP(r.net, lang)}{" "}
                            {r.net > 0 ? t.overpaid : r.net < 0 ? t.owes : t.settled}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
                          <div>
                            <span>{t.colPaid}: </span>
                            <strong className="text-foreground font-mono">{formatEGP(r.paid, lang)}</strong>
                            {r.payout > 0 && (
                              <span className="ms-2">({t.colPayout}: {formatEGP(r.payout, lang)})</span>
                            )}
                          </div>
                          <SettleRowButton
                            expenseId={s.expenseId}
                            partnerId={r.partnerId}
                            net={r.net}
                            lang={lang}
                          />
                        </div>
                      </div>
                    ))}
                    {s.rows.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        {t.noExpenses}
                      </p>
                    )}
                  </div>

                  {/* Desktop / tablet table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.colPartner}</TableHead>
                          <TableHead className="text-end">{t.colShare}</TableHead>
                          <TableHead className="text-end">{t.colShareAmount}</TableHead>
                          <TableHead className="text-end">{t.colPaid}</TableHead>
                          <TableHead className="text-end">{t.colPayout}</TableHead>
                          <TableHead className="text-end">{t.colNet}</TableHead>
                          <TableHead className="text-end">{t.colSettle}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {s.rows.map((r) => (
                          <TableRow key={r.partnerId}>
                            <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatPct(r.sharePercentage)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatEGP(r.shareAmount, lang)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {formatEGP(r.paid, lang)}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              {r.payout > 0 ? (
                                formatEGP(r.payout, lang)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              <Badge
                                variant={
                                  r.net > 0
                                    ? "success"
                                    : r.net < 0
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {formatEGP(r.net, lang)}{" "}
                                {r.net > 0 ? t.overpaid : r.net < 0 ? t.owes : t.settled}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-end whitespace-nowrap">
                              <SettleRowButton
                                expenseId={s.expenseId}
                                partnerId={r.partnerId}
                                net={r.net}
                                lang={lang}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {s.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              {t.noExpenses}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium">{t.payTitle}</p>
                      <CompanyPaymentForm
                        expenseId={s.expenseId}
                        lang={lang}
                        partners={partners.map((p) => ({ id: p.id, name: p.name }))}
                      />
                    </div>
                    <div className="space-y-2">
                      {expense.payments.map((pay) => (
                        <div
                          key={pay.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {pay.partner.name} · {formatEGP(Number(pay.amount), lang)}
                          </span>
                          <DeleteCompanyPaymentButton id={pay.id} lang={lang} />
                        </div>
                      ))}
                      {expense.payments.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t.emptyPayments}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {settlements.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t.noExpenses}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
