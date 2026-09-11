"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dict } from "@/lib/dict";
import { formatDate, formatEGP, formatPct, type Lang } from "@/lib/format";
import type { MonthlyPartnerRow } from "@/lib/ledger";
import { cn } from "@/lib/utils";

function kindLabel(kind: "fixed" | "variable" | "project", lang: Lang): string {
  const t = dict[lang].summary;
  return kind === "fixed" ? t.kindFixed : kind === "variable" ? t.kindVariable : t.kindProject;
}

/** Balance table with an expandable "why" breakdown per partner. */
export function SummaryRows({
  lang,
  rows,
}: {
  lang: Lang;
  rows: MonthlyPartnerRow[];
}) {
  const t = dict[lang].summary;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>{t.colPartner}</TableHead>
          <TableHead className="text-end">{t.colPaid}</TableHead>
          <TableHead className="text-end">{t.colOwe}</TableHead>
          <TableHead className="text-end">{t.colBalance}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const open = openId === r.partnerId;
          const abs = formatEGP(Math.abs(r.balance), lang);
          const why =
            r.balance < -0.005
              ? t.whyOwes(formatEGP(r.paid, lang), formatEGP(r.share, lang), abs)
              : r.balance > 0.005
                ? t.whyOwed(formatEGP(r.paid, lang), formatEGP(r.share, lang), abs)
                : t.whySettled;
          return (
            <Fragment key={r.partnerId}>
              <TableRow>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : r.partnerId)}
                    aria-expanded={open}
                    title={t.whyToggle}
                    aria-label={`${t.whyToggle} — ${r.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
                    />
                  </button>
                </TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-end">{formatEGP(r.paid, lang)}</TableCell>
                <TableCell className="text-end">
                  {formatEGP(r.share, lang)} ({formatPct(r.sharePercentage)})
                </TableCell>
                <TableCell
                  className={`text-end font-semibold ${r.balance > 0 ? "text-emerald-700" : r.balance < 0 ? "text-red-600" : "text-muted-foreground"}`}
                >
                  {formatEGP(Math.abs(r.balance), lang)}{" "}
                  {r.balance > 0 ? t.toHim : r.balance < 0 ? t.owes : t.settled}
                </TableCell>
              </TableRow>
              {open && (
                <TableRow key={`${r.partnerId}-why`} className="hover:bg-transparent">
                  <TableCell />
                  <TableCell colSpan={4}>
                    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-[13px]">
                      <p className="font-medium">{why}</p>
                      <p className="text-muted-foreground">
                        {t.colOwe}: {t.fixed} {formatEGP(r.shareFixed, lang)} · {t.variable}{" "}
                        {formatEGP(r.shareVariable, lang)} · {t.direct}{" "}
                        {formatEGP(r.shareDirect, lang)}
                      </p>
                      <p className="text-muted-foreground">
                        {t.colPaid}: {t.paidCompanyLabel} {formatEGP(r.paidCompany, lang)} ·{" "}
                        {t.paidProjectsLabel} {formatEGP(r.paidProjects, lang)}
                      </p>
                      {r.paidLines.length > 0 ? (
                        <ul className="space-y-1 border-t border-border/60 pt-2">
                          {r.paidLines.map((l, i) => (
                            <li
                              key={`${l.kind}-${l.title}-${l.date}-${i}`}
                              className="flex items-center gap-2"
                            >
                              <Badge variant="outline">{kindLabel(l.kind, lang)}</Badge>
                              <span className="min-w-0 flex-1 truncate">{l.title}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDate(l.date, lang)}
                              </span>
                              <span
                                dir="ltr"
                                className="shrink-0 font-mono tabular-nums"
                              >
                                {formatEGP(l.amount, lang)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="border-t border-border/60 pt-2 text-muted-foreground">
                          {t.empty}
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              {t.empty}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
