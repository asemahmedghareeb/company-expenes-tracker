"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { createProject } from "@/actions/projects";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

export function ProjectForm({
  partners,
  lang,
}: {
  partners: { id: string; name: string; defaultSharePercentage: number }[];
  lang: Lang;
}) {
  const t = dict[lang].projectForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SplitRow[]>(
    partners.map((p) => ({
      partnerId: p.id,
      name: p.name,
      sharePercentage: p.defaultSharePercentage,
    })),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const total = rows.reduce((a, r) => a + (Number(r.sharePercentage) || 0), 0);
    if (Math.abs(total - 100) >= 0.01) {
      setError(t.splitsError(total.toFixed(2)));
      return;
    }
    start(async () => {
      const res = await createProject({
        name: String(fd.get("name") ?? ""),
        description: String(fd.get("description") ?? ""),
        contractValue: Number(fd.get("contractValue") ?? 0),
        status: String(fd.get("status") ?? "ACTIVE"),
        splits: rows.map((r) => ({
          partnerId: r.partnerId,
          sharePercentage: Number(r.sharePercentage) || 0,
        })),
      });
      if (!res.ok) setError(res.error);
      else router.push(`/projects/${res.data.id}`);
    });
  }

  function preset5050() {
    if (rows.length < 2) return;
    const next = rows.map((r, i) =>
      i === 0
        ? { ...r, sharePercentage: 50 }
        : i === 1
          ? { ...r, sharePercentage: 50 }
          : { ...r, sharePercentage: 0 },
    );
    setRows(next);
  }

  function resetDefaults() {
    setRows(
      partners.map((p) => ({
        partnerId: p.id,
        name: p.name,
        sharePercentage: p.defaultSharePercentage,
      })),
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t.name}</Label>
        <Input id="name" name="name" required maxLength={150} placeholder={t.namePh} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="contractValue">{t.contractValue}</Label>
          <Input
            id="contractValue"
            name="contractValue"
            type="number"
            min={0.01}
            step={0.01}
            required
            placeholder="50000"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">{t.status}</Label>
          <select
            id="status"
            name="status"
            defaultValue="ACTIVE"
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
      <div className="grid gap-2">
        <Label htmlFor="description">{t.description}</Label>
        <Textarea id="description" name="description" placeholder={t.descPh} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t.snapshot}</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={resetDefaults}>
              {t.copyDefaults}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={preset5050}>
              {t.half}
            </Button>
          </div>
        </div>
        <SplitsEditor rows={rows} onChange={setRows} lang={lang} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.creating : t.create}
      </Button>
    </form>
  );
}
