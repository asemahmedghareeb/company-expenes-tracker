"use client";

import { useMemo, useState } from "react";
import { formatDate, formatEGP, type Lang } from "@/lib/format";
import { dict } from "@/lib/dict";
import { DeleteCompanyPayoutButton } from "@/components/forms/company-forms";
import { Pagination } from "@/components/ui/pagination";

export interface CompanyPayoutItem {
  id: string;
  amount: number;
  paidAt: string | Date;
  partner: { id: string; name: string };
  expense: { id: string; title: string } | null;
}

interface CompanyPayoutsListProps {
  payouts: CompanyPayoutItem[];
  lang: Lang;
}

export function CompanyPayoutsList({ payouts, lang }: CompanyPayoutsListProps) {
  const t = dict[lang].company;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const totalPages = Math.ceil(payouts.length / PAGE_SIZE) || 1;
  const paginatedPayouts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return payouts.slice(start, start + PAGE_SIZE);
  }, [payouts, page]);

  if (payouts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noPayouts}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {paginatedPayouts.map((x) => (
          <div
            key={x.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium text-foreground">{x.partner.name}</span> ·{" "}
              <span className="font-mono">{formatEGP(x.amount, lang)}</span>
              {x.expense && (
                <span className="text-muted-foreground text-xs">
                  {" "}
                  · {t.payoutTo} {x.expense.title}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {" "}
                · {formatDate(x.paidAt, lang)}
              </span>
            </span>
            <DeleteCompanyPayoutButton id={x.id} lang={lang} />
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={payouts.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        lang={lang}
        itemLabel={lang === "ar" ? "عملية رد" : "payouts"}
      />
    </div>
  );
}
