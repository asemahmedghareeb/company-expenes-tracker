"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setPartnerActive } from "@/actions/partners";
import { dict } from "@/lib/dict";
import type { Lang } from "@/lib/format";

export function SetActiveButton({
  id,
  isActive,
  lang,
}: {
  id: string;
  isActive: boolean;
  lang: Lang;
}) {
  const t = dict[lang].partners;
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
      {isActive ? t.deactivate : t.reactivate}
    </Button>
  );
}
