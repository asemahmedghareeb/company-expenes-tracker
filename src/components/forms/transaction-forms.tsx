"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { updateProjectSplits } from "@/actions/projects";
import {
  recordClientPayment,
  logProjectExpense,
  markExpenseReimbursed,
  recordPartnerDrawing,
} from "@/actions/finance";

/* ------------------------- Project splits editor ------------------------- */

export function ProjectSplitsEditor({
  projectId,
  initial,
}: {
  projectId: string;
  initial: SplitRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SplitRow[]>(initial);
  const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
  const valid = Math.abs(total - 100) < 0.01;

  return (
    <div className="space-y-3">
      <SplitsEditor rows={rows} onChange={setRows} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        disabled={pending || !valid}
        className="w-full"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await updateProjectSplits({
              projectId,
              splits: rows.map((r) => ({
                partnerId: r.partnerId,
                sharePercentage: Number(r.sharePercentage) || 0,
              })),
            });
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Saving…" : "Save project splits"}
      </Button>
    </div>
  );
}

/* ------------------------------ Payment form ------------------------------ */

export function PaymentForm({
  projectId,
  onDone,
}: {
  projectId: string;
  onDone?: () => void;
}) {
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
          <Label>Amount</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="10000" />
        </div>
        <div className="grid gap-1">
          <Label>Paid at</Label>
          <Input name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Milestone (optional)</Label>
        <Input name="milestoneLabel" maxLength={150} placeholder="Milestone 1 — Advance" />
      </div>
      <div className="grid gap-1">
        <Label>Notes (optional)</Label>
        <Textarea name="notes" placeholder="Bank ref, invoice no…" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}

/* ------------------------------ Expense form ------------------------------ */

export function ExpenseForm({
  projectId,
  partners,
  onDone,
}: {
  projectId: string;
  partners: { id: string; name: string }[];
  onDone?: () => void;
}) {
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
          <Label>Paid by</Label>
          <select
            name="paidByPartnerId"
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select partner…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Amount</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="2500" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Description</Label>
        <Input name="description" required maxLength={500} placeholder="Server costs, travel…" />
      </div>
      <div className="grid gap-1">
        <Label>Expense date</Label>
        <Input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Logging…" : "Log expense"}
      </Button>
    </form>
  );
}

/* ------------------------------ Drawing form ------------------------------ */

export function DrawingForm({
  partners,
  defaultPartnerId,
  onDone,
}: {
  partners: { id: string; name: string }[];
  defaultPartnerId?: string;
  onDone?: () => void;
}) {
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
          <Label>Partner</Label>
          <select
            name="partnerId"
            required
            defaultValue={defaultPartnerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>Amount</Label>
          <Input name="amount" type="number" min={0.01} step={0.01} required placeholder="5000" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Notes (optional)</Label>
        <Input name="notes" maxLength={1000} placeholder="Monthly draw…" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Recording…" : "Record drawing"}
      </Button>
    </form>
  );
}

/* ---------------------------- Reimburse toggle ---------------------------- */

export function ReimburseButton({
  expenseId,
  isReimbursed,
}: {
  expenseId: string;
  isReimbursed: boolean;
}) {
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
      {pending ? "…" : isReimbursed ? "Unmark" : "Mark reimbursed"}
    </Button>
  );
}
