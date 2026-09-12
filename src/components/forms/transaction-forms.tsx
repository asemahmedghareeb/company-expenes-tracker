"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Trash2, Wallet, Check, ChevronDown, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { deleteProject, updateProject, updateProjectSplits } from "@/actions/projects";
import { recordClientPayment } from "@/actions/payments";
import {
  createExpense,
  logProjectExpense,
  markExpenseReimbursed,
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

const STANDARD_EXPENSE_CATEGORIES = [
  { ar: "حجز دومين / نطاق (Domain)", en: "Domain Name Registration" },
  { ar: "استضافة وسيرفرات (Hosting & Servers)", en: "Hosting & Server Infrastructure" },
  { ar: "خدمات سحابية وتخزين (Cloud Services)", en: "Cloud Services (AWS, Vercel, Supabase)" },
  { ar: "أدوات وتراخيص برمجية (Software Licenses)", en: "Software Licenses & Subscriptions" },
  { ar: "تصميم وجرافيك وميديا (Design & Media)", en: "Design & Media Assets" },
  { ar: "فريلانسر واستشارات خارجية (Freelancers)", en: "Freelancers & Contractors" },
  { ar: "إعلانات وتسويق رقمي (Marketing & Ads)", en: "Digital Marketing & Advertising" },
  { ar: "مصاريف إدارية وبنكية (Admin & Bank Fees)", en: "Administrative & Bank Fees" },
];

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>("");
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

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat],
    );
  }

  const selectedProjectExpenseTitles = (projectExpenses ?? [])
    .filter((e) => selectedExpenseIds.includes(e.id))
    .map((e) => e.description);

  const allSelectedDescriptions = [
    ...selectedProjectExpenseTitles,
    ...selectedCategories,
  ];

  const displayDescription = allSelectedDescriptions.join(" + ");

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
            setSelectedCategories([]);
            setCustomInput("");
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
          {allSelectedDescriptions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedExpenseIds([]);
                setSelectedCategories([]);
                setCustomInput("");
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
            allSelectedDescriptions.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 me-2">
            {allSelectedDescriptions.length === 0 ? (
              <span>{t.chooseExpensesDropdown}</span>
            ) : (
              allSelectedDescriptions.map((desc, idx) => (
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
            {allSelectedDescriptions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-mono">
                {allSelectedDescriptions.length}
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

        {/* Dropdown Panel Menu with Checkboxes */}
        {isDropdownOpen && (
          <div className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 space-y-3 max-h-80 overflow-y-auto">
            {/* Section 1: Project registered expenses */}
            {projectExpenses && projectExpenses.length > 0 && (
              <div className="space-y-1.5">
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
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors select-none",
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
              </div>
            )}

            {/* Section 2: Standard Expense Categories */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="text-xs font-semibold text-muted-foreground px-1">
                {t.commonCategoriesSection}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {STANDARD_EXPENSE_CATEGORIES.map((cat, i) => {
                  const label = lang === "ar" ? cat.ar : cat.en;
                  const isChecked = selectedCategories.includes(label);
                  return (
                    <label
                      key={i}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors border select-none",
                        isChecked
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border/40 hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(label)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="truncate">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Custom item input */}
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground px-1">
                {t.customExpensePrompt}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === "ar" ? "اكتب اسم بند مخصص..." : "Type custom item name..."}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (customInput.trim()) {
                        toggleCategory(customInput.trim());
                        setCustomInput("");
                      }
                    }
                  }}
                  className="flex h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customInput.trim()) {
                      toggleCategory(customInput.trim());
                      setCustomInput("");
                    }
                  }}
                  className="h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  {lang === "ar" ? "إضافة" : "Add"}
                </button>
              </div>
            </div>

            {/* Bottom confirmation */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <div className="text-xs font-mono text-muted-foreground">
                {allSelectedDescriptions.length > 0
                  ? t.selectedCount(allSelectedDescriptions.length, formatEGP(amount, lang))
                  : ""}
              </div>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(false)}
                className="px-3 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                {lang === "ar" ? "تم الاختيار" : "Done"}
              </button>
            </div>
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
