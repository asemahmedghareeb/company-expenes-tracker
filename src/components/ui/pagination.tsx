"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/format";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  lang?: Lang;
  className?: string;
  itemLabel?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  lang = "ar",
  className = "",
  itemLabel,
}: PaginationProps) {
  if (totalItems <= pageSize && totalPages <= 1) {
    return null;
  }

  const isRtl = lang === "ar";
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft;
  const LastIcon = isRtl ? ChevronsLeft : ChevronsRight;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate visible page numbers with smart ellipsis
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "ellipsis")[] = [];
    pages.push(1);

    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground ${className}`}
    >
      {/* Range text */}
      <div>
        {lang === "ar" ? (
          <span>
            عرض <strong className="text-foreground font-mono font-medium">{startItem}</strong> -{" "}
            <strong className="text-foreground font-mono font-medium">{endItem}</strong> من أصل{" "}
            <strong className="text-foreground font-mono font-medium">{totalItems}</strong>{" "}
            {itemLabel ?? "سجل"}
          </span>
        ) : (
          <span>
            Showing <strong className="text-foreground font-mono font-medium">{startItem}</strong> -{" "}
            <strong className="text-foreground font-mono font-medium">{endItem}</strong> of{" "}
            <strong className="text-foreground font-mono font-medium">{totalItems}</strong>{" "}
            {itemLabel ?? "items"}
          </span>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
          title={lang === "ar" ? "الصفحة الأولى" : "First page"}
        >
          <FirstIcon className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-8 px-2 text-xs gap-1"
        >
          <PrevIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === "ar" ? "السابق" : "Prev"}</span>
        </Button>

        {/* Numeric page buttons */}
        <div className="flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-xs text-muted-foreground select-none"
                >
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-md font-mono text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "hover:bg-muted text-foreground border border-border/40"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-8 px-2 text-xs gap-1"
        >
          <span className="hidden sm:inline">{lang === "ar" ? "التالي" : "Next"}</span>
          <NextIcon className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0"
          title={lang === "ar" ? "الصفحة الأخيرة" : "Last page"}
        >
          <LastIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
