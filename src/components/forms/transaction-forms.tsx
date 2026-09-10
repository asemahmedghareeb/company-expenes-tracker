"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { deleteProject, updateProject, updateProjectSplits } from "@/actions/projects";
import {
  recordClientPayment,
  logProjectExpense,
  markExpenseReimbursed,
  recordPartnerDrawing,
  deletePartnerDrawing,
} from "@/actions/finance";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
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
  lang,
  onDone,
}: {
  projectId: string;
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
      <div className="grid grid-cols-2 gap-3">
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
  lang,
  onDone,
}: {
  projectId: string;
  partners: { id: string; name: string }[];
  lang: Lang;
  onDone?: () => void;
}) {
  const t = dict[lang].expenseForm;
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
          const res = await logProjectExpense({
            projectId,
            paidByPartnerId: String(fd.get("paidByPartnerId") ?? ""),
            amount: Number(fd.get("amount") ?? 0),
            description: String(fd.get("description") ?? ""),
            expenseDate: fd.get("expenseDate")
              ? new Date(String(fd.get("expenseDate")))
              : new Date(),
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
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.paidBy}</Label>
          <select
            name="paidByPartnerId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t.selectPartner}</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value={CLIENT_PAYER}>{t.clientPaid}</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{t.amount}</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="2500" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>{t.description}</Label>
        <Input name="description" required maxLength={500} placeholder={t.descPh} />
      </div>
      <div className="grid gap-1">
        <Label>{t.expenseDate}</Label>
        <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
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
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label>{t.partner}</Label>
          <select
            name="partnerId"
            required
            defaultValue={defaultPartnerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
