"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Building2,
  Check,
  ChevronDown,
  Coins,
  FolderKanban,
  Layers,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  Vault,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { executeSettlement, deleteSettlement } from "@/actions/settlements";
import { formatEGP, formatPct, type Lang, cn } from "@/lib/format";
import { round2 } from "@/lib/ledger";
import { splitMoney } from "@/lib/shares";

export interface SettlementDialogProject {
  id: string;
  name: string;
  contractValue: number;
  netCash: number;
  splits: { partnerId: string; sharePercentage: number }[];
}

export interface SettlementDialogPartner {
  id: string;
  name: string;
  defaultSharePercentage: number;
  isActive: boolean;
}

export function SettlementExecutionDialog({
  partners,
  projects,
  totalPooledCash,
  lang,
}: {
  partners: SettlementDialogPartner[];
  projects: SettlementDialogProject[];
  totalPooledCash: number;
  lang: Lang;
}) {
  const isAr = lang === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<"ALL" | "PROJECT">("PROJECT");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id ?? "",
  );
  const [vaultPercentage, setVaultPercentage] = useState<number>(10);
  const [settledAt, setSettledAt] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState<string>("");

  const activePartners = useMemo(
    () => partners.filter((p) => p.isActive),
    [partners],
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  // Maximum available amount for current scope
  const maxAvailable = useMemo(() => {
    if (scope === "ALL") return Math.max(0, totalPooledCash);
    return Math.max(0, selectedProject?.netCash ?? 0);
  }, [scope, totalPooledCash, selectedProject]);

  const [customAmount, setCustomAmount] = useState<string>("");

  // Actual amount to settle
  const amountToSettle = useMemo(() => {
    if (customAmount !== "") {
      const num = Number(customAmount);
      return Number.isFinite(num) && num > 0 ? num : 0;
    }
    return maxAvailable;
  }, [customAmount, maxAvailable]);

  // Calculations
  const vaultCut = round2(amountToSettle * (vaultPercentage / 100));
  const distributableCash = round2(amountToSettle - vaultCut);

  // Partner distributions preview
  const partnerShares = useMemo(() => {
    if (scope === "PROJECT" && selectedProject) {
      return selectedProject.splits.map((s) => {
        const partner = partners.find((p) => p.id === s.partnerId);
        return {
          partnerId: s.partnerId,
          name: partner?.name ?? "—",
          percentage: s.sharePercentage,
        };
      });
    }
    // Scope ALL
    return activePartners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      percentage: p.defaultSharePercentage,
    }));
  }, [scope, selectedProject, partners, activePartners]);

  const distributedAmounts = useMemo(() => {
    if (distributableCash <= 0 || partnerShares.length === 0) return [];
    const parts = splitMoney(
      distributableCash,
      partnerShares.map((s) => s.percentage),
    );
    return partnerShares.map((s, idx) => ({
      ...s,
      amount: parts[idx] ?? 0,
    }));
  }, [distributableCash, partnerShares]);

  function handleConfirm() {
    if (amountToSettle <= 0) {
      setError(isAr ? "يرجى إدخال مبلغ صحيح للتسوية." : "Please enter a valid amount to settle.");
      return;
    }
    setError(null);
    start(async () => {
      const res = await executeSettlement({
        scope,
        projectId: scope === "PROJECT" ? selectedProjectId : null,
        totalAmount: amountToSettle,
        vaultPercentage,
        settledAt: new Date(settledAt),
        notes: notes.trim() || undefined,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setOpen(false);
        setCustomAmount("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-primary text-primary-foreground shadow-sm hover:brightness-110"
      >
        <Vault className="h-4 w-4" />
        <span className="font-semibold">
          {isAr ? "تنفيذ تسوية وتوزيع أرباح" : "Execute Profit Settlement"}
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={isAr ? "rtl" : "ltr"} className="sm:max-w-xl h-full max-h-screen flex flex-col p-0">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Vault className="h-5 w-5" />
                <DialogTitle className="text-lg">
                  {isAr ? "تنفيذ تسوية الأرباح وتغذية خزنة الشركة" : "Execute Settlement & Fund Company Vault"}
                </DialogTitle>
              </div>
              <DialogDescription>
                {isAr
                  ? "توزيع مبالغ الكاش المحصلة على الشركاء بعد اقتطاع النسبة المحددة لخزنة الشركة. يُسجل لكل شريك سحب نقدي معتمد دفترياً."
                  : "Distribute collected cash to partners after withholding the designated cut for the company vault."}
              </DialogDescription>
            </div>
            <DialogCloseButton />
          </DialogHeader>

          <DialogBody className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Step 1: Scope */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                {isAr ? "1. نطاق التسوية" : "1. Settlement Scope"}
              </Label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setScope("PROJECT");
                    setCustomAmount("");
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-xl border text-start transition-all",
                    scope === "PROJECT"
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-foreground">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <span>{isAr ? "مشروع محدد" : "Specific Project"}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "توزيع أرباح مشروع وفق حصص شركائه" : "Distribute per project partner shares"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScope("ALL");
                    setCustomAmount("");
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-xl border text-start transition-all",
                    scope === "ALL"
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-border/70 hover:bg-muted/50 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>{isAr ? "كل أموال الشركة" : "All Pooled Funds"}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "توزيع عام وفق نسب الشركاء الافتراضية" : "Distribute per company default equity"}
                  </span>
                </button>
              </div>
            </div>

            {/* Project Picker if scope === PROJECT */}
            {scope === "PROJECT" && (
              <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/30 p-3">
                <Label className="text-xs font-medium text-foreground">
                  {isAr ? "اختر المشروع المراد تسوية أرباحه" : "Select Project to Settle"}
                </Label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setCustomAmount("");
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-xs sm:text-sm shadow-sm"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {isAr ? "الصافي المتاح:" : "Available:"} {formatEGP(p.netCash, lang)}
                    </option>
                  ))}
                </select>
                {selectedProject && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-0.5">
                    <span>{isAr ? "صافي أرباح المشروع المحصلة:" : "Project Net Cash:"}</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatEGP(selectedProject.netCash, lang)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Amount to Settle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  {isAr ? "2. إجمالي المبلغ الخاضع للتسوية (ج.م.)" : "2. Total Amount to Settle (EGP)"}
                </Label>
                <button
                  type="button"
                  onClick={() => setCustomAmount("")}
                  className="text-[11px] text-primary hover:underline"
                >
                  {isAr ? "استخدام كامل المتاح" : "Use full available"} ({formatEGP(maxAvailable, lang)})
                </button>
              </div>
              <Input
                type="number"
                min={0.01}
                step={0.01}
                value={customAmount !== "" ? customAmount : maxAvailable > 0 ? maxAvailable : ""}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={String(maxAvailable)}
                className="font-mono text-base font-semibold"
                required
              />
            </div>

            {/* Step 3: Company Vault Cut (خزنة الشركة) */}
            <div className="space-y-2 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3.5 dark:border-indigo-950 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  <Vault className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{isAr ? "3. استقطاع خزنة الشركة (احتياطي الأرباح)" : "3. Company Vault Reserve"}</span>
                </div>
                <Badge variant="outline" className="border-indigo-300 font-mono text-indigo-800 dark:text-indigo-300">
                  {vaultPercentage}% = {formatEGP(vaultCut, lang)}
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "النسبة التي يتم حجزها في خزنة الشركة للأمور الطارئة والتطوير، ويتم توزيع الباقي على الشركاء."
                  : "Percentage retained in company reserves; remaining cash is distributed to partners."}
              </p>

              {/* Quick % buttons */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                {[0, 5, 10, 15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setVaultPercentage(pct)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                      vaultPercentage === pct
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-background border border-border/80 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {pct}%
                  </button>
                ))}
                <div className="flex items-center gap-1 ms-auto">
                  <span className="text-xs text-muted-foreground">%</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={vaultPercentage}
                    onChange={(e) => setVaultPercentage(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="h-7 w-16 rounded-md border border-input bg-background px-2 text-center text-xs font-semibold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Live Breakdown Summary & Partner Distribution */}
            <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3.5 shadow-xs">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between pb-1 border-b border-border/50">
                <span>{isAr ? "معاينة التوزيع المحاسبي النهائي" : "Distribution Preview"}</span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                  {isAr ? "الموزع للشركاء:" : "Distributed:"} {formatEGP(distributableCash, lang)} ({100 - vaultPercentage}%)
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {distributedAmounts.map((d) => (
                  <div
                    key={d.partnerId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{d.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 font-mono">
                        {formatPct(d.percentage)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatEGP(d.amount, lang)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({isAr ? "سحب كاش" : "Drawing"})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Date & Optional Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="grid gap-1">
                <Label className="text-xs">{isAr ? "تاريخ التسوية" : "Settlement Date"}</Label>
                <Input
                  type="date"
                  value={settledAt}
                  onChange={(e) => setSettledAt(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">{isAr ? "ملاحظات (اختياري)" : "Notes (Optional)"}</Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? "مثال: تسوية الدفعة الثانية..." : "e.g. Milestone 2 settlement..."}
                  className="text-xs"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="shrink-0 bg-card border-t border-border/60 px-5 py-3.5 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {isAr ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={pending || amountToSettle <= 0}
              className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            >
              <Check className="h-4 w-4" />
              <span>
                {pending
                  ? (isAr ? "جاري تنفيذ التسوية..." : "Executing...")
                  : (isAr ? "تأكيد تنفيذ التسوية وتوزيع الأموال" : "Confirm & Distribute Funds")}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DeleteSettlementButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const isAr = lang === "ar";
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteSettlement(id);
      if (!res.ok) {
        setError(res.error);
        setArmed(false);
      } else {
        router.refresh();
      }
    });
  }

  if (!armed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        title={isAr ? "إلغاء وحذف هذه التسوية" : "Delete & Reverse Settlement"}
        onClick={() => setArmed(true)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        variant="destructive"
        className="h-7 text-xs px-2"
        disabled={pending}
        onClick={confirm}
      >
        {pending ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "تأكيد الإلغاء" : "Confirm Delete")}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        disabled={pending}
        onClick={() => setArmed(false)}
      >
        {isAr ? "تراجع" : "Cancel"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
