"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/badge";

export function MonthPicker({ month, label }: { month: string; label: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="month">{label}</Label>
      <Input
        id="month"
        type="month"
        value={month}
        onChange={(e) => {
          if (e.target.value) router.push(`/summary?month=${e.target.value}`);
        }}
        className="w-44"
      />
    </div>
  );
}
