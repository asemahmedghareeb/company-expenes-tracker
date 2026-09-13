"use server";

import { toPublicError } from "@/lib/api-guard";

import { requireAdmin } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { round2, toNumber } from "@/lib/ledger";
import { splitMoney } from "@/lib/shares";
import {
  executeSettlementSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";

export async function executeSettlement(
  raw: unknown,
): Promise<ActionResult<{ id: string; vaultAmount: number; distributedAmount: number }>> {
  await requireAdmin();
  const parsed = executeSettlementSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid settlement data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }

  const { scope, projectId, totalAmount, vaultPercentage, settledAt, notes } =
    parsed.data;

  if (totalAmount <= 0) {
    return { ok: false, error: "Settlement amount must be greater than zero." };
  }

  // 1. Calculate vault cut & distributable amount
  const vaultAmount = round2(totalAmount * (vaultPercentage / 100));
  const distributedAmount = round2(totalAmount - vaultAmount);

  // 2. Fetch partner splits based on scope
  let partnerSplits: { partnerId: string; sharePercentage: number; partnerName?: string }[] = [];
  let projectTitle: string | null = null;

  if (scope === "PROJECT") {
    if (!projectId) {
      return { ok: false, error: "A project must be selected for project-scoped settlement." };
    }
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        projectPartners: {
          include: { partner: true },
        },
      },
    });
    if (!project) {
      return { ok: false, error: "Project not found." };
    }
    projectTitle = project.name;
    partnerSplits = project.projectPartners.map((pp) => ({
      partnerId: pp.partnerId,
      sharePercentage: pp.sharePercentage,
      partnerName: pp.partner.name,
    }));
  } else {
    // Scope === "ALL"
    const activePartners = await db.partner.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    partnerSplits = activePartners.map((p) => ({
      partnerId: p.id,
      sharePercentage: p.defaultSharePercentage,
      partnerName: p.name,
    }));
  }

  if (partnerSplits.length === 0) {
    return { ok: false, error: "No partners found to distribute funds to." };
  }

  // Calculate each partner's share of the distributed cash
  const sharesArray = partnerSplits.map((s) => s.sharePercentage);
  const distributedParts = splitMoney(distributedAmount, sharesArray);

  const distributions = partnerSplits.map((split, i) => ({
    partnerId: split.partnerId,
    percentage: split.sharePercentage,
    amount: distributedParts[i] ?? 0,
    partnerName: split.partnerName,
  }));

  try {
    const settlement = await db.$transaction(async (tx) => {
      // 1. Create company settlement record
      const s = await tx.companySettlement.create({
        data: {
          title:
            scope === "PROJECT"
              ? `تسوية أرباح مشروع ${projectTitle ?? ""}`
              : "تسوية أرباح عامة وشاملة",
          projectId: scope === "PROJECT" ? projectId : null,
          totalAmount,
          vaultPercentage,
          vaultAmount,
          distributedAmount,
          settledAt,
          notes: notes || null,
        },
      });

      // 2. For each partner with amount > 0, create drawing and distribution
      for (const dist of distributions) {
        let drawingId: string | null = null;
        if (dist.amount > 0) {
          const drawing = await tx.partnerDrawing.create({
            data: {
              partnerId: dist.partnerId,
              amount: dist.amount,
              drawnAt: settledAt,
              notes:
                scope === "PROJECT"
                  ? `تسوية أرباح مشروع ${projectTitle ?? ""} (سحب نقدي معتمد) - #${s.id.slice(0, 8)}`
                  : `تسوية أرباح عامة (سحب نقدي معتمد) - #${s.id.slice(0, 8)}`,
            },
          });
          drawingId = drawing.id;
        }

        await tx.partnerSettlementDistribution.create({
          data: {
            settlementId: s.id,
            partnerId: dist.partnerId,
            percentage: dist.percentage,
            amount: dist.amount,
            drawingId,
          },
        });
      }

      return s;
    });

    revalidatePath("/capital");
    revalidatePath("/ledger");
    revalidatePath("/summary");
    revalidatePath("/projects");
    if (projectId) {
      revalidatePath(`/projects/${projectId}`);
    }

    return {
      ok: true,
      data: {
        id: settlement.id,
        vaultAmount,
        distributedAmount,
      },
    };
  } catch (e: unknown) {
    return {
      ok: false,
      error: toPublicError(e, "Failed to execute settlement."),
    };
  }
}

export async function deleteSettlement(
  settlementId: string,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  try {
    await db.$transaction(async (tx) => {
      const settlement = await tx.companySettlement.findUnique({
        where: { id: settlementId },
        include: { distributions: true },
      });

      if (!settlement) {
        throw new Error("Settlement not found.");
      }

      const drawingIds = settlement.distributions
        .map((d) => d.drawingId)
        .filter((id): id is string => Boolean(id));

      if (drawingIds.length > 0) {
        await tx.partnerDrawing.deleteMany({
          where: { id: { in: drawingIds } },
        });
      }

      await tx.companySettlement.delete({
        where: { id: settlementId },
      });
    });

    revalidatePath("/capital");
    revalidatePath("/ledger");
    revalidatePath("/summary");
    revalidatePath("/projects");

    return { ok: true, data: { id: settlementId } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: toPublicError(e, "Failed to delete settlement."),
    };
  }
}
