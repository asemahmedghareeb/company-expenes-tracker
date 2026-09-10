"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SplitsEditor, type SplitRow } from "./splits-editor";
import { updateDefaultSplits } from "@/actions/partners";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";
import { normalizeShares, sharesSumTo100 } from "@/lib/shares";

export function DefaultSplitsForm({
  initial,
  lang,
}: {
  initial: { partnerId: string; name: string; sharePercentage: number }[];
  lang: Lang;
}) {
  const t = dict[lang].defaultsForm;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SplitRow[]>(
    initial.map((r) => ({ ...r, active: true })),
  );

  const valid = sharesSumTo100(rows.map((r) => r.sharePercentage));

  function save() {
    setError(null);
    start(async () => {
      const shares = normalizeShares(rows.map((r) => Number(r.sharePercentage) || 0));
      const res = await updateDefaultSplits(
        rows.map((r, i) => ({
          partnerId: r.partnerId,
          sharePercentage: shares[i] ?? 0,
        })),
      );
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <SplitsEditor rows={rows} onChange={setRows} lang={lang} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={save} disabled={pending || !valid} className="w-full">
        {pending ? t.saving : t.save}
      </Button>
    </div>
  );
}
