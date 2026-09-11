"use client";

import { formatEGP, type Lang } from "@/lib/format";
import { dict } from "@/lib/dict";

/**
 * High-density financial preview pill:
 * Contract − Firm expenses = Estimated net profit (emerald).
 * Client-covered rows shown as a muted excluded badge.
 */
export function FinancePill({
  lang,
  contractValue,
  firmExpenses,
  clientCovered,
}: {
  lang: Lang;
  contractValue: number;
  firmExpenses: number;
  clientCovered: number;
}) {
  const t = dict[lang].projectForm;
  const net = Math.max(0, contractValue - firmExpenses);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[13px]">
      <span className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">{t.contractValue}</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatEGP(contractValue, lang)}
        </span>
      </span>
      <span aria-hidden className="text-muted-foreground">
        −
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">{t.totalExpenses}</span>
        <span className="font-mono font-semibold tabular-nums">
          {formatEGP(firmExpenses, lang)}
        </span>
      </span>
      <span aria-hidden className="text-muted-foreground">
        =
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-muted-foreground">{t.estProfit}</span>
        <span className="font-mono text-base font-bold text-emerald-700 tabular-nums dark:text-emerald-400">
          {formatEGP(net, lang)}
        </span>
      </span>
      {clientCovered > 0 && (
        <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2 py-0.5 text-xs text-muted-foreground">
          {t.clientCovered}
          <span className="font-mono tabular-nums">{formatEGP(clientCovered, lang)}</span>
        </span>
      )}
    </div>
  );
}
