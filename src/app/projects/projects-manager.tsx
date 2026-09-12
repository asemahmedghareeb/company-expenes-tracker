"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogHeader,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/forms/project-form";
import { dict } from "@/lib/dict";
import { formatEGP, type Lang } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageGuide } from "@/components/ui/page-guide";
import { Pagination } from "@/components/ui/pagination";

export type ProjectRow = {
  id: string;
  name: string;
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
  contractValue: number;
  inflow: number;
  out: number;
  net: number;
  partnerCount: number;
};

const STATUS_ORDER = ["ACTIVE", "UPCOMING", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;

export function ProjectsManager({
  lang,
  partners,
  projects,
  hasActivePartners,
}: {
  lang: Lang;
  partners: { id: string; name: string; defaultSharePercentage: number }[];
  projects: ProjectRow[];
  hasActivePartners: boolean;
}) {
  const t = dict[lang];
  const tp = t.projectsPage;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>("ALL");
  const [query, setQuery] = useState("");

  const activeCount = useMemo(
    () => projects.filter((p) => p.status === "ACTIVE").length,
    [projects],
  );
  const pipeline = useMemo(
    () => projects.reduce((a, p) => a + p.contractValue, 0),
    [projects],
  );

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projects) m.set(p.status, (m.get(p.status) ?? 0) + 1);
    return m;
  }, [projects]);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    setPage(1);
  }, [status, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (status !== "ALL" && p.status !== status) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, status, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const Chevron = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-5" dir={dir}>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">{tp.title}</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{tp.subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">{tp.statsActive}</span>
              <span className="font-mono font-semibold tabular-nums">{activeCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1">
              <span className="text-muted-foreground">{tp.statsPipeline}</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatEGP(pipeline, lang)}
              </span>
            </span>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          {lang === "ar" ? `+ ${tp.newProjectBtn}` : `+ ${tp.newProjectBtn}`}
        </Button>
      </div>

      {/* Filter chips + search */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={status === "ALL"}
              onClick={() => setStatus("ALL")}
              label={`${tp.filterAll} · ${projects.length}`}
            />
            {STATUS_ORDER.filter((s) => statusCounts.has(s)).map((s) => (
              <FilterChip
                key={s}
                active={status === s}
                onClick={() => setStatus(status === s ? "ALL" : s)}
                label={`${t.projectForm.statuses[s]} · ${statusCounts.get(s)}`}
              />
            ))}
          </div>
          <div className="relative ms-auto w-full sm:w-56">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp.searchPh}
              aria-label={tp.searchPh}
              className="h-8 ps-8 text-[13px]"
            />
          </div>
        </div>
      )}

      {/* Table / empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="text-sm font-semibold">{tp.emptyTitle}</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">{tp.emptyDesc}</p>
          {hasActivePartners ? (
            <Button onClick={() => setOpen(true)} className="mt-2">
              <Plus className="h-4 w-4" /> {tp.emptyCta}
            </Button>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {tp.addFirstPre}{" "}
              <Link href="/partners" className="font-medium text-primary underline">
                {tp.partnersLink}
              </Link>{" "}
              {tp.addFirstPost}
            </p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {tp.noResults}
        </div>
      ) : (
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start text-[11px]">{tp.colProject}</TableHead>
                <TableHead className="text-start text-[11px]">{tp.colStatus}</TableHead>
                <TableHead className="text-end text-[11px]">{tp.colContract}</TableHead>
                <TableHead className="text-end text-[11px]">{tp.colInflow}</TableHead>
                <TableHead className="text-end text-[11px]">{tp.colOut}</TableHead>
                <TableHead className="text-end text-[11px]">{tp.colNet}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProjects.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="text-start">
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {p.partnerCount} {tp.partnersWord}
                    </span>
                  </TableCell>
                  <TableCell className="text-start">
                    <Badge
                      variant={
                        p.status === "ACTIVE"
                          ? "success"
                          : p.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {t.projectForm.statuses[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    {formatEGP(p.contractValue, lang)}
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    {formatEGP(p.inflow, lang)}
                  </TableCell>
                  <TableCell className="text-end font-mono tabular-nums">
                    {formatEGP(p.out, lang)}
                  </TableCell>
                  <TableCell className="text-end font-mono font-semibold tabular-nums">
                    {formatEGP(p.net, lang)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Link
                      href={`/projects/${p.id}`}
                      aria-label={p.name}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Chevron className="h-4 w-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            lang={lang}
            itemLabel={lang === "ar" ? "مشروع" : "projects"}
          />
        </div>
      )}

      {/* Creation sheet */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={dir}>
          <DialogHeader>
            <div>
              <DialogTitle>{tp.newTitle}</DialogTitle>
              <DialogDescription>{tp.newDesc}</DialogDescription>
            </div>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody>
            {hasActivePartners ? (
              <ProjectForm
                lang={lang}
                partners={partners}
                onSuccess={() => setOpen(false)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {tp.addFirstPre}{" "}
                <Link href="/partners" className="font-medium text-primary underline">
                  {tp.partnersLink}
                </Link>{" "}
                {tp.addFirstPost}
              </p>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <PageGuide
        lang={lang}
        title={lang === "ar" ? "دليل حسابات المشاريع والعقود" : "Projects & Contracts Financial Guide"}
        subtitle={
          lang === "ar"
            ? "المرجع المحاسبي المعتمد لكيفية حساب أرباح المشاريع، ومصروفات التشغيل، والتحصيل"
            : "Official accounting reference for project profits, direct operational expenses, and collections"
        }
        steps={[
          {
            title: lang === "ar" ? "قيمة العقد والتحصيل" : "Contract Value & Collections",
            text:
              lang === "ar"
                ? "العميل يدفع فقط قيمة العقد المتفق عليها. أي دفعة يسلمها العميل لأحد الشركاء تُسجل كـ «عهدة مشروع» تحت يد ذلك الشريك."
                : "The client pays the contract value. Payments received are tracked as project custody cash.",
          },
          {
            title: lang === "ar" ? "مصروفات المشروع" : "Project Direct Expenses",
            text:
              lang === "ar"
                ? "تُسدد جميع تكاليف المشروع (سيرفرات، نطاقات، تصاميم، اشتراكات) من أموال العقد (كاش العهدة). وإذا دفع شريك من ماله الخاص، يُسجل له كدين مستحق السداد."
                : "All project costs are paid out of contract funds (custody cash) or reimbursed if paid out of pocket.",
          },
          {
            title: lang === "ar" ? "صافي أرباح المشروع" : "Net Project Profit",
            text:
              lang === "ar"
                ? "المتبقي الصافي من أموال العقد بعد استقطاع كافة مصروفات المشروع، وهو المبلغ الذي يوزع على الشركاء حسب نسب حصصهم المحددة للمشروع."
                : "The remaining surplus after deducting all project costs, distributed to partners according to their project shares.",
            badge: { text: lang === "ar" ? "أرباح للشركاء" : "Partner Profits", variant: "success" },
          },
        ]}
        equations={[
          {
            label: lang === "ar" ? "معادلة صافي ربح العقد التقديري" : "Contract Net Profit Equation",
            formula:
              lang === "ar"
                ? "صافي ربح العقد = قيمة العقد الإجمالية − إجمالي مصروفات المشروع"
                : "Contract Net Profit = Total Contract Value − Total Project Expenses",
          },
          {
            label: lang === "ar" ? "معادلة الربح المحقق الفعلي (Source of Truth)" : "Realized Profit Equation",
            formula:
              lang === "ar"
                ? "الربح المحقق = الحد الأقصى ( 0 ، إجمالي المحصل الفعلي من العميل − إجمالي المصروفات )"
                : "Realized Profit = Math.max(0, Total Collected Inflow − Total Expenses)",
            explanation:
              lang === "ar"
                ? "لا يُوزع ربح محقق إلا بعد أن تغطي دفعات العميل المحصلة كافة مصاريف وتكاليف المشروع أولاً."
                : "No realized profit is distributed until collected client funds exceed direct project costs.",
          },
        ]}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
        active
          ? "border-primary/40 bg-accent text-accent-foreground"
          : "border-border/60 bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {label}
    </button>
  );
}
