"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";
import { addPartner, editPartner } from "@/actions/partners";

export function PartnerForm({
  initial,
}: {
  initial?: {
    id: string;
    name: string;
    email: string | null;
    defaultSharePercentage: number;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      defaultSharePercentage: Number(fd.get("defaultSharePercentage") ?? 0),
      isActive: fd.get("isActive") === "on",
    };
    start(async () => {
      const res = initial
        ? await editPartner(initial.id, payload)
        : await addPartner(payload);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required maxLength={100} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email (optional)</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initial?.email ?? ""}
          placeholder="partner@firm.com"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="defaultSharePercentage">Default equity %</Label>
          <Input
            id="defaultSharePercentage"
            name="defaultSharePercentage"
            type="number"
            min={0}
            max={100}
            step={0.01}
            defaultValue={initial?.defaultSharePercentage ?? 0}
            required
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={initial?.isActive ?? true}
            className="h-4 w-4"
          />
          <Label htmlFor="isActive">Active partner</Label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : initial ? "Save changes" : "Add partner"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Note: changing a default % never rewrites historic project splits. Use
        “Update defaults” to re-balance globals to 100%.
      </p>
    </form>
  );
}
