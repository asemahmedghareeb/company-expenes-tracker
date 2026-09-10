"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { PartnerForm } from "@/components/forms/partner-form";
import { deletePartner, setPartnerActive } from "@/actions/partners";
import { formatPct } from "@/lib/format";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

export interface PartnerRowData {
  id: string;
  name: string;
  email: string | null;
  defaultSharePercentage: number;
  isActive: boolean;
}

/**
 * One partner table row + inline edit form + guarded delete.
 * Delete only succeeds for partners with zero history; otherwise the
 * server returns HAS_HISTORY and we point at deactivation instead.
 */
export function PartnerRow({
  partner,
  lang,
}: {
  partner: PartnerRowData;
  lang: Lang;
}) {
  const t = dict[lang].partners;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleActive() {
    setError(null);
    start(async () => {
      await setPartnerActive(partner.id, !partner.isActive);
      router.refresh();
    });
  }

  function confirmDelete() {
    setError(null);
    start(async () => {
      const res = await deletePartner(partner.id);
      if (!res.ok) {
        setError(
          res.error === "HAS_HISTORY" ? t.deleteHasHistory : res.error,
        );
        setArmed(false);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{partner.name}</TableCell>
        <TableCell className="text-muted-foreground">{partner.email ?? "—"}</TableCell>
        <TableCell className="text-end">{formatPct(partner.defaultSharePercentage)}</TableCell>
        <TableCell>
          <Badge variant={partner.isActive ? "success" : "secondary"}>
            {partner.isActive ? t.active : t.inactive}
          </Badge>
        </TableCell>
        <TableCell className="text-end">
          <div className="flex flex-col items-end gap-1">
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing((v) => !v);
                  setArmed(false);
                }}
              >
                {t.edit}
              </Button>
              {!armed ? (
                <Button size="sm" variant="outline" onClick={() => setArmed(true)}>
                  {t.delete}
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pending}
                    onClick={confirmDelete}
                  >
                    {pending ? t.deleting : t.deleteConfirm}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setArmed(false)}
                  >
                    {t.cancel}
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" disabled={pending} onClick={toggleActive}>
                {partner.isActive ? t.deactivate : t.reactivate}
              </Button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow>
          <TableCell colSpan={5}>
            <div className="mx-auto max-w-xl py-2">
              <PartnerForm
                lang={lang}
                initial={partner}
                onDone={() => setEditing(false)}
              />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
