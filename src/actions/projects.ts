"use server";

import { revalidatePath } from "next/cache";
import { prisma as db } from "@/lib/prisma";
import {
  createProjectSchema,
  updateProjectSchema,
  updateProjectSplitsSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import { normalizeShares, CLIENT_PAYER } from "@/lib/shares";

/**
 * Create a project + snapshot its equity into ProjectPartner.
 * `splits` may be auto-populated from global defaults or fully custom
 * (e.g. 2 partners at 50/50). Historic rows never mutate afterwards.
 */
export async function createProject(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "Invalid project data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const { name, description, contractValue, status, splits, initialExpenses } =
    parsed.data;

  // Both existence checks are independent — fan out concurrently.
  // All expense payers must exist (client-covered rows need none).
  const payerIds = [
    ...new Set(
      initialExpenses
        .map((e) => e.paidByPartnerId)
        .filter((id) => id !== CLIENT_PAYER),
    ),
  ];
  const [partners, payers] = await Promise.all([
    db.partner.findMany({
      where: { id: { in: splits.map((s) => s.partnerId) } },
      select: { id: true },
    }),
    payerIds.length > 0
      ? db.partner.findMany({
          where: { id: { in: payerIds } },
          select: { id: true },
        })
      : Promise.resolve([] as { id: string }[]),
  ]);
  if (partners.length !== splits.length) {
    return { ok: false, error: "One or more split partners do not exist." };
  }
  if (payers.length !== payerIds.length) {
    return { ok: false, error: "One or more expense payers do not exist." };
  }

  try {
    const shares = normalizeShares(splits.map((s) => s.sharePercentage));
    const project = await db.project.create({
      data: {
        name,
        description: description || null,
        contractValue,
        status,
        projectPartners: {
          create: splits.map((s, i) => ({
            partnerId: s.partnerId,
            sharePercentage: shares[i] ?? s.sharePercentage,
          })),
        },
        // Up-front out-of-pocket costs → pending-reimbursement expense rows.
        // CLIENT-covered rows store NULL payer (info only, excluded from books).
        expenses: {
          create: initialExpenses.map((e) => ({
            paidByPartnerId:
              e.paidByPartnerId === CLIENT_PAYER ? null : e.paidByPartnerId,
            amount: e.amount,
            description: e.title,
          })),
        },
      },
    });
    revalidatePath("/projects");
    revalidatePath("/ledger");
    revalidatePath("/summary");
    revalidatePath("/");
    return { ok: true, data: { id: project.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to create project.",
    };
  }
}

/** Edit project metadata (never touches equity — use updateProjectSplits). */
export async function updateProject(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProjectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid project data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const { projectId, ...data } = parsed.data;
  try {
    await db.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description || null }
          : {}),
        ...(data.contractValue !== undefined
          ? { contractValue: data.contractValue }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/ledger");
    revalidatePath("/summary");
    revalidatePath("/");
    return { ok: true, data: { id: projectId } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update project.",
    };
  }
}

/**
 * Adjust ONE project's snapshot equity (delete + recreate join rows
 * transactionally). Global defaults and OTHER projects are untouched.
 */
export async function updateProjectSplits(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProjectSplitsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Project splits must sum to exactly 100%.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const { projectId, splits } = parsed.data;

  // Independent existence checks — run concurrently.
  const [existing, partners] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    }),
    db.partner.findMany({
      where: { id: { in: splits.map((s) => s.partnerId) } },
      select: { id: true },
    }),
  ]);
  if (!existing) return { ok: false, error: "Project not found." };
  if (partners.length !== splits.length) {
    return { ok: false, error: "One or more split partners do not exist." };
  }

  try {
    const shares = normalizeShares(splits.map((s) => s.sharePercentage));
    await db.$transaction([
      db.projectPartner.deleteMany({ where: { projectId } }),
      db.projectPartner.createMany({
        data: splits.map((s, i) => ({
          projectId,
          partnerId: s.partnerId,
          sharePercentage: shares[i] ?? s.sharePercentage,
        })),
      }),
    ]);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
    revalidatePath("/ledger");
    revalidatePath("/capital");
    revalidatePath("/summary");
    revalidatePath("/");
    return { ok: true, data: { id: projectId } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update splits.",
    };
  }
}

/**
 * Permanently delete a project and ALL its history (snapshot splits,
 * client payments, expenses cascade via onDelete: Cascade).
 * Partner balances will change — caller must confirm with the user first.
 */
export async function deleteProject(
  projectId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.project.delete({ where: { id: projectId } });
    revalidatePath("/projects");
    revalidatePath("/ledger");
    revalidatePath("/capital");
    revalidatePath("/summary");
    revalidatePath("/");
    return { ok: true, data: { id: projectId } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete project.",
    };
  }
}
