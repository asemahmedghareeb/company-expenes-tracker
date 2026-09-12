"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2, Wallet, Check, ChevronDown, Plus, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { deleteProject, updateProject, updateProjectSplits } from "@/actions/projects";
import { recordClientPayment, deleteClientPayment } from "@/actions/payments";
import {
  createExpense,
  deleteExpense,
  logProjectExpense,
  markExpenseReimbursed,
  updateProjectExpense,
} from "@/actions/expenses";
import {
  recordPartnerDrawing,
  deletePartnerDrawing,
} from "@/actions/finance";
import { dict } from "@/lib/dict";
import { formatEGP, type Lang, cn } from "@/lib/format";
import { round2 } from "@/lib/ledger";
import { normalizeShares, sharesSumTo100, CLIENT_PAYER } from "@/lib/shares";

/* ------------------------- Project splits editor ------------------------- */

export function ProjectSplitsEditor({
  projectId,
  initial,
  lang,
}: {
  projectId: string;
  initial: SplitRow[];
  lang: Lang;
}) {
  const t = dict[lang].projectDetail;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SplitRow[]>(initial);
  const valid = sharesSumTo100(rows.map((r) => r.sharePercentage));

  return (
    <div className="space-y-3">
      <SplitsEditor rows={rows} onChange={setRows} lang={lang} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        disabled={pending || !valid}
        className="w-full"
        onClick={() =>
          start(async () => {
            setError(null);
            const shares = normalizeShares(rows.map((r) => Number(r.sharePercentage) || 0));
            const res = await updateProjectSplits({
              projectId,
              splits: rows.map((r, i) => ({
                partnerId: r.partnerId,
                sharePercentage: shares[i] ?? 0,
              })),
            });
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? t.saving : t.saveSplits}
      </Button>
    </div>
  );
}

/* ------------------------------ Payment form ------------------------------ */

export function PaymentForm({
  projectId,
  partners,
  lang,
  onDone,
}: {
  projectId: string;
  partners: { id: string; name: string }[];
  lang: Lang;
  onDone?: () => void;
}) {
  const t = dict[lang].paymentForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await recordClientPayment({
            projectId,
            amount: Number(fd.get("amount") ?? 0),
            milestoneLabel: String(fd.get("milestoneLabel") ?? ""),
            notes: String(fd.get("notes") ?? ""),
            paidAt: fd.get("paidAt") ? new Date(String(fd.get("paidAt"))) : new Date(),
            receivedByPartnerId: String(fd.get("receivedByPartnerId") ?? ""),
          });
          if (!res.ok) setError(res.error);
          else {
            (e.target as HTMLFormElement).reset();
            router.refresh();
            onDone?.();
          }
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="10000" />
        </div>
        <div className="grid gap-1">
          <Label>{t.paidAt}</Label>
          <Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.receivedBy}</Label>
        <select
          name="receivedByPartnerId"
          required
          defaultValue=""
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
        >
          <option value="">{t.selectCustodian}</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label>{t.milestone}</Label>
        <Input name="milestoneLabel" maxLength={150} placeholder={t.milestonePh} />
      </div>
      <div className="grid gap-1">
        <Label>{t.notes}</Label>
        <Textarea name="notes" placeholder={t.notesPh} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.recording : t.record}
      </Button>
    </form>
  );
}

/* ------------------------------ Expense form ------------------------------ */

export function ExpenseForm({
  projectId,
  partners,
  custodyBreakdown,
  projectName,
  projectExpenses,
  lang,
  onDone,
}: {
  projectId?: string;
  partners: { id: string; name: string }[];
  custodyBreakdown?: {
    partnerId: string;
    partnerName: string;
    inflow: number;
    outflow: number;
    netCustody: number;
    isCashHolder: boolean;
  }[];
  projectName?: string;
  projectExpenses?: {
    id: string;
    description: string;
    amount: number;
    isReimbursed: boolean;
    deductFromCustody: boolean;
    paidById?: string | null;
  }[];
  lang: Lang;
  onDone?: () => void;
}) {
  const t = dict[lang].expenseForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Auto-detect partner holding project custody cash
  const primaryCashHolder = custodyBreakdown?.find(
    (c) => c.isCashHolder && c.netCustody > 0,
  );
  const defaultPayerId = primaryCashHolder
    ? primaryCashHolder.partnerId
    : (partners[0]?.id ?? "");

  const [deductFromCustody, setDeductFromCustody] = useState(
    Boolean(primaryCashHolder && projectId),
  );
  const [selectedPartnerId, setSelectedPartnerId] = useState(defaultPayerId);
  const [amount, setAmount] = useState<number>(0);

  // Available custody cash for currently selected partner
  const selectedPartnerCustody =
    custodyBreakdown?.find((c) => c.partnerId === selectedPartnerId)?.netCustody ?? 0;

  const exceedsCustody =
    deductFromCustody &&
    amount > selectedPartnerCustody &&
    selectedPartnerId !== CLIENT_PAYER;
  const custodyExceededBy = exceedsCustody
    ? round2(amount - selectedPartnerCustody)
    : 0;

  function handleDeductToggle(checked: boolean) {
    setDeductFromCustody(checked);
    if (checked && primaryCashHolder) {
      setSelectedPartnerId(primaryCashHolder.partnerId);
    }
  }

  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleProjectExpense(id: string) {
    setSelectedExpenseIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      const sumExpenses = (projectExpenses ?? [])
        .filter((e) => next.includes(e.id))
        .reduce((acc, e) => acc + e.amount, 0);
      setAmount(round2(sumExpenses));
      return next;
    });
  }

  const selectedProjectExpenseTitles = (projectExpenses ?? [])
    .filter((e) => selectedExpenseIds.includes(e.id))
    .map((e) => e.description);

  const displayDescription = selectedProjectExpenseTitles.join(" + ");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        setInfoMessage(null);
        start(async () => {
          const rawAmount = Number(fd.get("amount") ?? 0) || amount;
          const desc = displayDescription || String(fd.get("description") ?? "");
          const res = await createExpense({
            projectId: projectId || null,
            paidById: selectedPartnerId,
            amount: rawAmount,
            description: desc || (lang === "ar" ? "مصروف مشروع" : "Project expense"),
            expenseDate: fd.get("expenseDate")
              ? new Date(String(fd.get("expenseDate")))
              : new Date(),
            deductFromCustody: Boolean(
              deductFromCustody || selectedPartnerId === CLIENT_PAYER,
            ),
            expenseIds: selectedExpenseIds.length > 0 ? selectedExpenseIds : undefined,
          });
          if (!res.ok) {
            setError(res.error);
          } else {
            if (res.data.exceededCustody) {
              setInfoMessage(
                lang === "ar"
                  ? `تنبيه: المبلغ تجاوز العهدة المتاحة (${formatEGP(res.data.availableCustody, lang)}) — تم تسجيل المصروف كـ (شريك دافع من جيبه)`
                  : `Alert: Amount exceeded available custody (${formatEGP(res.data.availableCustody, lang)}) — recorded as Paid Out of Pocket.`,
              );
            }
            setSelectedExpenseIds([]);
            setAmount(0);
            (e.target as HTMLFormElement).reset();
            router.refresh();
            onDone?.();
          }
        });
      }}
    >
      {/* Option: Deduct from project cash (خصم من عهدة مشروع) */}
      {projectId && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deductFromCustody}
              onChange={(e) => handleDeductToggle(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-primary" />
              {t.deductFromCustody}
            </span>
          </label>
          <p className="text-xs text-muted-foreground ps-6">
            {t.deductFromCustodyHint}
          </p>

          {/* Breakdown per partner: العهدة الصافية الحالية لمشروع X */}
          {custodyBreakdown && custodyBreakdown.length > 0 && (
            <div className="pt-2 border-t border-border/50 text-xs space-y-1.5">
              <div className="font-medium text-muted-foreground">
                {projectName
                  ? dict[lang].projectDetail.netCustodyBreakdownTitle(projectName)
                  : "العهدة الصافية الحالية لمشروع:"}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {custodyBreakdown.map((c) => (
                  <div
                    key={c.partnerId}
                    onClick={() => {
                      if (deductFromCustody) setSelectedPartnerId(c.partnerId);
                    }}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                      c.partnerId === selectedPartnerId && deductFromCustody
                        ? "border-primary bg-primary/15 font-semibold ring-1 ring-primary"
                        : "border-muted bg-background/60 hover:bg-muted/40",
                    )}
                  >
                    <span>{c.partnerName}</span>
                    <span
                      dir="ltr"
                      className={cn(
                        "font-mono font-medium",
                        c.netCustody > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {formatEGP(c.netCustody, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real-time alert indicator if amount exceeds available custody cash */}
      {exceedsCustody && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="font-semibold">{t.paidOutOfPocketIndicator}</div>
            <div>{t.exceedsCustodyAlert(formatEGP(custodyExceededBy, lang))}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.paidBy}</Label>
          <select
            name="paidByPartnerId"
            value={selectedPartnerId}
            onChange={(e) => setSelectedPartnerId(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
          >
            <option value="">{t.selectPartner}</option>
            {partners.map((p) => {
              const cust =
                custodyBreakdown?.find((c) => c.partnerId === p.id)?.netCustody ?? 0;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} {cust > 0 ? `(${formatEGP(cust, lang)})` : ""}
                </option>
              );
            })}
            <option value={CLIENT_PAYER}>{t.clientPaid}</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input
            name="amount"
            type="number"
            min={0.01}
            step={0.01}
            required
            placeholder="2500"
            value={amount > 0 ? amount : ""}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Dropdown with Checkboxes instead of plain description */}
      <div className="grid gap-1 relative" ref={dropdownRef}>
        <div className="flex items-center justify-between">
          <Label>{t.description}</Label>
          {selectedExpenseIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedExpenseIds([]);
                setAmount(0);
              }}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              {lang === "ar" ? "مسح التحديد" : "Clear selection"}
            </button>
          )}
        </div>

        {/* The Dropdown Trigger Button */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen((o) => !o)}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all text-start",
            isDropdownOpen && "ring-2 ring-primary border-transparent",
            selectedProjectExpenseTitles.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 me-2">
            {selectedProjectExpenseTitles.length === 0 ? (
              <span>{t.chooseExpensesDropdown}</span>
            ) : (
              selectedProjectExpenseTitles.map((desc, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium"
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[160px]">{desc}</span>
                </span>
              ))
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
            {selectedProjectExpenseTitles.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                {selectedProjectExpenseTitles.length}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isDropdownOpen && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Hidden input for form validation and submission */}
        <input
          type="hidden"
          name="description"
          value={displayDescription}
          required
        />

        {/* Dropdown Panel Menu with Checkboxes: ONLY Project Expenses */}
        {isDropdownOpen && (
          <div className="absolute top-full start-0 z-50 mt-1 w-full rounded-xl border border-border bg-card text-card-foreground shadow-2xl p-2.5 space-y-2 max-h-60 overflow-y-auto">
            {projectExpenses && projectExpenses.length > 0 ? (
              <>
                <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between px-1">
                  <span>{t.projectExpensesSection}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {lang === "ar" ? "(احتساب المبلغ تلقائياً)" : "(Auto-sums amount)"}
                  </span>
                </div>
                <div className="space-y-1">
                  {projectExpenses.map((pe) => {
                    const isChecked = selectedExpenseIds.includes(pe.id);
                    return (
                      <label
                        key={pe.id}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors select-none",
                          isChecked
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/60 hover:bg-muted/50 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectExpense(pe.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="font-medium">{pe.description}</span>
                          {pe.deductFromCustody ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {lang === "ar" ? "مسدد من العهدة" : "From Custody"}
                            </span>
                          ) : pe.isReimbursed ? (
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {lang === "ar" ? "مسدد" : "Reimbursed"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              {lang === "ar" ? "معلق مطلوب سداده" : "Pending"}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-semibold tabular-nums">
                          {formatEGP(pe.amount, lang)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <div className="text-xs font-mono text-muted-foreground">
                    {selectedExpenseIds.length > 0
                      ? t.selectedCount(selectedExpenseIds.length, formatEGP(amount, lang))
                      : ""}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    {lang === "ar" ? "تأكيد الاختيار" : "Confirm"}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
                <p>
                  {t.noPendingExpenses || (lang === "ar" ? "لا توجد مصاريف مسجلة لهذا المشروع بعد." : "No expenses recorded for this project yet.")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {lang === "ar"
                    ? "استخدم زر «إضافة مصروف جديد للمشروع» لإضافة بنود أولاً."
                    : "Use '+ Add Project Expense' to record project expenses first."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-1">
        <Label>{t.expenseDate}</Label>
        <Input
          name="expenseDate"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {infoMessage && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{infoMessage}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.logging : t.log}
      </Button>
    </form>
  );
}

/* ------------------------------ Drawing form ------------------------------ */

export function DrawingForm({
  partners,
  defaultPartnerId,
  lang,
  onDone,
}: {
  partners: { id: string; name: string }[];
  defaultPartnerId?: string;
  lang: Lang;
  onDone?: () => void;
}) {
  const t = dict[lang].drawingForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await recordPartnerDrawing({
            partnerId: String(fd.get("partnerId") ?? defaultPartnerId ?? ""),
            amount: Number(fd.get("amount") ?? 0),
            notes: String(fd.get("notes") ?? ""),
            drawnAt: fd.get("drawnAt") ? new Date(String(fd.get("drawnAt"))) : new Date(),
          });
          if (!res.ok) setError(res.error);
          else {
            (e.target as HTMLFormElement).reset();
            router.refresh();
            onDone?.();
          }
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.partner}</Label>
          <select
            name="partnerId"
            required
            defaultValue={defaultPartnerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
          >
            <option value="">{t.select}</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="5000" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.notes}</Label>
        <Input name="notes" maxLength={1000} placeholder={t.notesPh} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.recording : t.record}
      </Button>
    </form>
  );
}

/* ---------------------------- Reimburse toggle ---------------------------- */

export function ReimburseButton({
  expenseId,
  isReimbursed,
  lang,
}: {
  expenseId: string;
  isReimbursed: boolean;
  lang: Lang;
}) {
  const t = dict[lang].projectDetail;
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={isReimbursed ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markExpenseReimbursed({ expenseId, isReimbursed: !isReimbursed });
          router.refresh();
        })
      }
    >
      {pending ? "…" : isReimbursed ? t.unmark : t.mark}
    </Button>
  );
}

/* --------------------------- Edit project meta --------------------------- */

export function EditProjectForm({
  project,
  lang,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    contractValue: number;
    status: "UPCOMING" | "ACTIVE" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
  };
  lang: Lang;
}) {
  const t = dict[lang].projectForm;
  const td = dict[lang].projectDetail;
  const tp = dict[lang].partnerForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const res = await updateProject({
            projectId: project.id,
            name: String(fd.get("name") ?? ""),
            description: String(fd.get("description") ?? ""),
            contractValue: Number(fd.get("contractValue") ?? 0),
            status: String(fd.get("status") ?? project.status),
          });
          if (!res.ok) setError(res.error);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-1">
        <Label>{t.name}</Label>
        <Input name="name" required maxLength={150} defaultValue={project.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.contractValue}</Label>
          <Input
            name="contractValue"
            type="number"
            min={0.01}
            step={0.01}
            required
            defaultValue={project.contractValue}
          />
        </div>
        <div className="grid gap-1">
          <Label>{t.status}</Label>
          <select
            name="status"
            defaultValue={project.status}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm"
          >
            <option value="UPCOMING">{t.statuses.UPCOMING}</option>
            <option value="ACTIVE">{t.statuses.ACTIVE}</option>
            <option value="COMPLETED">{t.statuses.COMPLETED}</option>
            <option value="ON_HOLD">{t.statuses.ON_HOLD}</option>
            <option value="CANCELLED">{t.statuses.CANCELLED}</option>
          </select>
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.description}</Label>
        <Textarea
          name="description"
          defaultValue={project.description ?? ""}
          placeholder={t.descPh}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? td.saving : tp.save}
      </Button>
    </form>
  );
}

/* ------------------------------ Delete project ---------------------------- */

export function DeleteProjectButton({
  projectId,
  lang,
}: {
  projectId: string;
  lang: Lang;
}) {
  const t = dict[lang].projectDetail;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteProject(projectId);
      if (!res.ok) {
        setError(res.error);
        setArmed(false);
      } else {
        router.push("/projects");
        router.refresh();
      }
    });
  }

  if (!armed) {
    return (
      <Button variant="destructive" onClick={() => setArmed(true)}>
        {t.delete}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? t.deleting : t.deleteConfirm}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => setArmed(false)}>
          {t.cancel}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/* ---------------------------- Delete drawing ---------------------------- */

export function DeleteDrawingButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
}) {
  const t = dict[lang].ledger;
  const tp = dict[lang].partners;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deletePartnerDrawing(id);
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
        title={t.cancelDrawing}
        aria-label={t.cancelDrawing}
        onClick={() => setArmed(true)}
        className="hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="destructive" disabled={pending} onClick={confirm}>
          {pending ? tp.deleting : tp.deleteConfirm}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setArmed(false)}>
          {tp.cancel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ---------------------------- Delete Project Expense ---------------------------- */

export function DeleteExpenseButton({
  id,
  projectId,
  lang,
}: {
  id: string;
  projectId?: string;
  lang: Lang;
}) {
  const tp = dict[lang].partners;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteExpense(id, projectId);
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
        title={lang === "ar" ? "حذف المصروف من المشروع" : "Delete project expense"}
        aria-label={lang === "ar" ? "حذف المصروف من المشروع" : "Delete project expense"}
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
        {pending ? tp.deleting : tp.deleteConfirm}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        disabled={pending}
        onClick={() => setArmed(false)}
      >
        {tp.cancel}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------------------- Delete Client Payment ---------------------------- */

export function DeleteClientPaymentButton({
  id,
  projectId,
  lang,
}: {
  id: string;
  projectId: string;
  lang: Lang;
}) {
  const tp = dict[lang].partners;
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    start(async () => {
      const res = await deleteClientPayment(id, projectId);
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
        title={lang === "ar" ? "حذف/إلغاء الدفعة" : "Cancel/Delete payment"}
        aria-label={lang === "ar" ? "حذف/إلغاء الدفعة" : "Cancel/Delete payment"}
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
        {pending ? tp.deleting : tp.deleteConfirm}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs px-2"
        disabled={pending}
        onClick={() => setArmed(false)}
      >
        {tp.cancel}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/* ---------------------------- Add Project Expense Dialog ---------------------------- */

export function AddProjectExpenseDialog({
  projectId,
  projectName,
  partners,
  lang,
}: {
  projectId: string;
  projectName: string;
  partners: { id: string; name: string }[];
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAr = lang === "ar";

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        <span>{isAr ? "إضافة مصروف جديد للمشروع" : "Add Project Expense"}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAr ? `إضافة مصروف لمشروع: ${projectName}` : `Add Expense: ${projectName}`}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "سجل بند مصروف جديد (مثل حجز دومين، سيرفر، استضافة) مع قيمته وطريقة سداده."
                : "Add a new project expense item with its estimated cost."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form
              className="space-y-4 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const description = String(fd.get("description") ?? "").trim();
                const amount = Number(fd.get("amount") ?? 0);
                const payer = String(fd.get("payer") ?? CLIENT_PAYER);
                const expenseDate = fd.get("expenseDate")
                  ? new Date(String(fd.get("expenseDate")))
                  : new Date();

                if (!description || amount <= 0) return;

                const isClientCovered = payer === CLIENT_PAYER;
                setError(null);
                start(async () => {
                  const res = await createExpense({
                    projectId,
                    description,
                    amount,
                    expenseDate,
                    paidById: isClientCovered ? CLIENT_PAYER : payer,
                    deductFromCustody: isClientCovered,
                  });
                  if (!res.ok) {
                    setError(res.error);
                  } else {
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <div className="grid gap-1.5">
                <Label>{isAr ? "اسم / وصف المصروف" : "Expense Name / Description"}</Label>
                <Input
                  name="description"
                  placeholder={isAr ? "مثال: حجز دومين، استضافة وسيرفرات..." : "e.g. Domain, Cloud servers..."}
                  required
                  maxLength={150}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{isAr ? "المبلغ (ج.م.)" : "Amount (EGP)"}</Label>
                  <Input
                    name="amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="1000"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{isAr ? "تاريخ المصروف" : "Expense Date"}</Label>
                  <Input
                    name="expenseDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>{isAr ? "طريقة السداد / الدافع" : "Payment Source / Payer"}</Label>
                <select
                  name="payer"
                  defaultValue={CLIENT_PAYER}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value={CLIENT_PAYER}>
                    {isAr ? "خصم من أموال / عهدة العقد (الافتراضي)" : "From Contract / Project Funds (Default)"}
                  </option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? `شريك دافع من جيبه: ${p.name}` : `Paid Out of Pocket by: ${p.name}`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {isAr
                    ? "«خصم من أموال العقد» تسدد المصروف مباشرة من فلوس المشروع. اختيار شريك يسجل المصروف كمستحق للشريك في رصيده."
                    : "Contract funds deduct directly from project cash. Selecting a partner records an out-of-pocket claim."}
                </p>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? (isAr ? "جاري الإضافة..." : "Adding...") : (isAr ? "إضافة المصروف" : "Add Expense")}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------------------- Edit Project Expense Dialog ---------------------------- */

export function EditProjectExpenseDialog({
  expense,
  projectId,
  partners,
  lang,
}: {
  expense: {
    id: string;
    description: string;
    amount: number;
    expenseDate: string | Date;
    paidById?: string | null;
    deductFromCustody: boolean;
  };
  projectId: string;
  partners: { id: string; name: string }[];
  lang: Lang;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isAr = lang === "ar";
  const defaultDate = expense.expenseDate
    ? new Date(expense.expenseDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const defaultPayer =
    expense.deductFromCustody && !expense.paidById
      ? CLIENT_PAYER
      : expense.paidById ?? CLIENT_PAYER;

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        title={isAr ? "تعديل المصروف وطريقة السداد" : "Edit expense & payer"}
        aria-label={isAr ? "تعديل المصروف وطريقة السداد" : "Edit expense & payer"}
        onClick={() => setOpen(true)}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {isAr ? "تعديل المصروف وطريقة الدفع" : "Edit Expense & Payment Source"}
            </DialogTitle>
            <DialogDescription>
              {isAr
                ? "يمكنك تعديل بيان المصروف أو تغيير من دفعه وجعله مخصوماً من عهدة العقد أو مدفوعاً من شريك."
                : "Modify expense details or switch payer to contract custody / partner out-of-pocket."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form
              className="space-y-4 pt-1"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const description = String(fd.get("description") ?? "").trim();
                const amount = Number(fd.get("amount") ?? 0);
                const payer = String(fd.get("payer") ?? CLIENT_PAYER);
                const expenseDate = fd.get("expenseDate")
                  ? new Date(String(fd.get("expenseDate")))
                  : new Date();

                if (!description || amount <= 0) return;

                const isClientCovered = payer === CLIENT_PAYER;
                setError(null);
                start(async () => {
                  const res = await updateProjectExpense(expense.id, {
                    projectId,
                    description,
                    amount,
                    expenseDate,
                    paidById: isClientCovered ? null : payer,
                    deductFromCustody: isClientCovered,
                  });
                  if (!res.ok) {
                    setError(res.error);
                  } else {
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
            >
              <div className="grid gap-1.5">
                <Label>{isAr ? "اسم / وصف المصروف" : "Expense Name / Description"}</Label>
                <Input
                  name="description"
                  defaultValue={expense.description}
                  required
                  maxLength={150}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{isAr ? "المبلغ (ج.م.)" : "Amount (EGP)"}</Label>
                  <Input
                    name="amount"
                    type="number"
                    min={0.01}
                    step={0.01}
                    defaultValue={expense.amount}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>{isAr ? "تاريخ المصروف" : "Expense Date"}</Label>
                  <Input
                    name="expenseDate"
                    type="date"
                    defaultValue={defaultDate}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>{isAr ? "طريقة السداد / الدافع" : "Payment Source / Payer"}</Label>
                <select
                  name="payer"
                  defaultValue={defaultPayer}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm"
                >
                  <option value={CLIENT_PAYER}>
                    {isAr
                      ? "خصم من أموال / عهدة العقد (الافتراضي)"
                      : "From Contract / Project Funds (Default)"}
                  </option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? `شريك دافع من جيبه: ${p.name}` : `Paid Out of Pocket by: ${p.name}`}
                    </option>
                  ))}
                </select>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">
                    {isAr ? "💡 توضيح طريقة السداد:" : "💡 Payment Source Note:"}
                  </p>
                  <p>
                    {isAr
                      ? "• «خصم من أموال العقد»: يُسدد المصروف مباشرة من ميزانية المشروع ولا يُسجل أي دين للشريك."
                      : "• Contract Funds: Settles directly from project budget; no partner debt."}
                  </p>
                  <p>
                    {isAr
                      ? "• «شريك دافع من جيبه»: يُسجل المبلغ كحق مستحق للشريك بانتظار استرداده في التسوية."
                      : "• Partner Out-of-pocket: Records amount as an out-of-pocket claim to be reimbursed."}
                  </p>
                </div>
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending
                    ? isAr
                      ? "جاري الحفظ..."
                      : "Saving..."
                    : isAr
                      ? "حفظ التعديلات"
                      : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}

