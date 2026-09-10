"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPartnerActive } from "@/actions/partners";

export function SetActiveButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setPartnerActive(id, !isActive);
          router.refresh();
        })
      }
    >
      {isActive ? "Deactivate" : "Reactivate"}
    </Button>
  );
}
