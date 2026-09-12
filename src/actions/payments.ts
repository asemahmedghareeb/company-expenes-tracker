"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  clientPaymentSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";

function revalidateFinance(projectId?: string) {
  revalidateSystem(projectId ? `/projects/${projectId}` : undefined);
}

/** Record a milestone payment received from the client into a partner's custody. */
export async function recordClientPayment(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid payment data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const [project, custodian] = await Promise.all([
    db.project.findUnique({
      where: { id: parsed.data.projectId },
      select: { id: true },
    }),
    db.partner.findUnique({
      where: { id: parsed.data.receivedByPartnerId },
      select: { id: true },
    }),
  ]);
  if (!project) return { ok: false, error: "Project not found." };
  if (!custodian) return { ok: false, error: "Receiving partner not found." };

  try {
    const payment = await db.clientPayment.create({
      data: {
        projectId: parsed.data.projectId,
        amount: parsed.data.amount,
        milestoneLabel: parsed.data.milestoneLabel || null,
        notes: parsed.data.notes || null,
        paidAt: parsed.data.paidAt,
        receivedByPartnerId: parsed.data.receivedByPartnerId,
      },
    });
    revalidateFinance(parsed.data.projectId);
    return { ok: true, data: { id: payment.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to record payment.",
    };
  }
}

export async function deleteClientPayment(
  id: string,
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.clientPayment.delete({ where: { id } });
    revalidateFinance(projectId);
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete payment.",
    };
  }
}
