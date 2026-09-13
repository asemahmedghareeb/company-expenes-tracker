"use client";

import * as React from "react";
import { BookOpen, Calculator, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, type Lang } from "@/lib/format";

export interface GuideStep {
  number?: number | string;
  title?: string;
  text: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success";
  };
}

export interface GuideEquation {
  label: string;
  formula: string;
  explanation?: string;
}

export interface PageGuideProps {
  title: string;
  subtitle?: string;
  steps: GuideStep[];
  equations?: GuideEquation[];
  tips?: string[];
  lang?: Lang;
  defaultOpen?: boolean;
  className?: string;
}

export function PageGuide({
  title,
  subtitle,
  steps,
  equations,
  tips,
  lang = "ar",
  defaultOpen = false,
  className,
}: PageGuideProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const isAr = lang === "ar";

  if (!isOpen) {
    return (
      <div className={cn("pt-6 pb-2 border-t border-border/40 mt-8 flex items-center justify-start", className)}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-accent"
        >
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-200/70 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 group-hover:scale-110 transition-transform">
            <Lightbulb className="h-3.5 w-3.5" />
          </div>
          <span className="font-bold">{isAr ? "تفاصيل وإرشادات الصفحة" : "Page Details & Guidelines"}</span>
          <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
            ({title})
          </span>
          <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:text-indigo-300 text-[10px] py-0 px-1.5 font-normal">
            {isAr ? "دليل الشرح والمعادلات" : "Guide & Formulas"}
          </Badge>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-indigo-700 transition-colors" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("pt-6 pb-2 border-t border-border/40 mt-8", className)}>
      <Card
        className="overflow-hidden border-border bg-card shadow-sm"
      >
        <CardHeader
          className="cursor-pointer select-none py-3.5 px-4 sm:px-6 hover:bg-muted/30 transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-foreground">
                    {title}
                  </CardTitle>
                  <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:text-indigo-300 text-[11px] py-0 px-2 font-normal">
                    {isAr ? "دليل الشرح والمعادلات" : "Guide & Source of Truth"}
                  </Badge>
                </div>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground rounded-lg px-2 py-1 hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label={isAr ? "طي دليل الصفحة" : "Collapse guide"}
            >
              <ChevronUp className="h-4 w-4" />
              <span>{isAr ? "تصغير / إخفاء" : "Minimize"}</span>
            </button>
          </div>
        </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 px-4 pb-4 pt-1 sm:px-6 sm:pb-6 text-sm text-foreground/90 border-t border-border/50">
          {/* Steps and explanations */}
          <div className="space-y-2.5">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 mt-0.5">
                  {step.number ?? idx + 1}
                </span>
                <div className="flex-1 leading-relaxed text-xs sm:text-sm text-muted-foreground">
                  {step.title && (
                    <span className="font-semibold text-foreground">
                      {step.title}:{" "}
                    </span>
                  )}
                  <span>{step.text}</span>
                  {step.badge && (
                    <Badge
                      variant={step.badge.variant ?? "secondary"}
                      className="mx-1.5 align-middle text-[11px] py-0"
                    >
                      {step.badge.text}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Equations section (Source of Truth) */}
          {equations && equations.length > 0 && (
            <div className="mt-4 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200 mb-2">
                <Calculator className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {isAr
                    ? "المعادلات المحاسبية المعتمدة (Source of Truth)"
                    : "Accounting Equations (Source of Truth)"}
                </span>
              </div>
              <div className="space-y-2">
                {equations.map((eq, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-card/80 p-2.5 text-xs border border-border/60 shadow-xs"
                  >
                    <div className="text-muted-foreground font-medium mb-1">
                      {eq.label}
                    </div>
                    <div className="font-mono font-semibold text-indigo-900 dark:text-indigo-200 bg-muted/60 rounded px-2 py-1 text-xs sm:text-sm overflow-x-auto text-start dir-ltr">
                      {eq.formula}
                    </div>
                    {eq.explanation && (
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {eq.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips / Extra Notes */}
          {tips && tips.length > 0 && (
            <div className="space-y-1 text-xs text-muted-foreground pt-1">
              {tips.map((tip, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-amber-500">✦</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  </div>
);
}
