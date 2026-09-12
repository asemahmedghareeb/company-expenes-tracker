"use server";

import { revalidateSystem } from "@/lib/revalidate";
import { prisma as db } from "@/lib/prisma";
import {
  partnerSchema,
  defaultSplitsSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";
import { normalizeShares } from "@/lib/shares";

/** Add a new partner. */
export async function addPartner(
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = partnerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid partner data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const { name, email, defaultSharePercentage, isActive } = parsed.data;
  try {
    const partner = await db.partner.create({
      data: {
        name,
        email: email || null,
        defaultSharePercentage,
        isActive,
      },
    });
    revalidateSystem();
    return { ok: true, data: { id: partner.id } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create partner.";
    if (msg.includes("Unique constraint") || msg.includes("email")) {
      return { ok: false, error: "A partner with this email already exists." };
    }
    return { ok: false, error: msg };
  }
}

/** Edit an existing partner (name/email/default share/active flag). */
export async function editPartner(
  id: string,
  raw: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = partnerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid partner data.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  try {
    const partner = await db.partner.update({
      where: { id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email || null,
        defaultSharePercentage: parsed.data.defaultSharePercentage,
        isActive: parsed.data.isActive,
      },
    });
    revalidateSystem();
    return { ok: true, data: { id: partner.id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update partner.",
    };
  }
}

/** Activate / deactivate a partner without deleting history. */
export async function setPartnerActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  try {
    await db.partner.update({ where: { id }, data: { isActive } });
    revalidateSystem();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update partner.",
    };
  }
}

/**
 * Hard-delete a partner — ONLY when they have zero financial history
 * (no project splits, no paid expenses, no drawings). Otherwise returns
 * the `HAS_HISTORY` code so the UI can suggest deactivation instead.
 * This protects historic ledgers from ever being corrupted.
 */
export async function deletePartner(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const [splits, expenses, drawings] = await Promise.all([
      db.projectPartner.count({ where: { partnerId: id } }),
      db.expense.count({ where: { paidById: id } }),
      db.partnerDrawing.count({ where: { partnerId: id } }),
    ]);
    if (splits + expenses + drawings > 0) {
      return { ok: false, error: "HAS_HISTORY" };
    }
    await db.partner.delete({ where: { id } });
    revalidateSystem();
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to delete partner.",
    };
  }
}

/**
 * Update GLOBAL default splits. Must sum to 100 (Zod-enforced).
 * Historic ProjectPartner rows are NEVER touched here — only future
 * projects copy these defaults at creation time.
 */
export async function updateDefaultSplits(
  raw: unknown,
): Promise<ActionResult<{ updated: number }>> {
  const parsed = defaultSplitsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Default splits must sum to exactly 100%.",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  try {
    // Normalize rounding dust (e.g. 33.33×3) so stored rows sum to exactly 100.
    const shares = normalizeShares(parsed.data.map((r) => r.sharePercentage));
    await db.$transaction(
      parsed.data.map((row, i) =>
        db.partner.update({
          where: { id: row.partnerId },
          data: { defaultSharePercentage: shares[i] ?? row.sharePercentage },
        }),
      ),
    );
    revalidateSystem();
    return { ok: true, data: { updated: parsed.data.length } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update splits.",
    };
  }
}

/** Snapshot helper — active partners + defaults, for auto-populating a new project form. */
export async function getDefaultSplitsSnapshot(): Promise<
  { partnerId: string; name: string; sharePercentage: number }[]
> {
  const partners = await db.partner.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, defaultSharePercentage: true },
  });
  return partners.map((p) => ({
    partnerId: p.id,
    name: p.name,
    sharePercentage: p.defaultSharePercentage,
  }));
}
