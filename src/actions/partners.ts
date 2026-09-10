"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  partnerSchema,
  defaultSplitsSchema,
  type ActionResult,
  zodFieldErrors,
} from "@/lib/validations";

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
    revalidatePath("/partners");
    revalidatePath("/");
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
    revalidatePath("/partners");
    revalidatePath("/ledger");
    revalidatePath("/");
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
    revalidatePath("/partners");
    revalidatePath("/");
    return { ok: true, data: { id } };
  } catch (e: unknown) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update partner.",
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
    await db.$transaction(
      parsed.data.map((row) =>
        db.partner.update({
          where: { id: row.partnerId },
          data: { defaultSharePercentage: row.sharePercentage },
        }),
      ),
    );
    revalidatePath("/partners");
    revalidatePath("/");
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
  });
  return partners.map((p) => ({
    partnerId: p.id,
    name: p.name,
    sharePercentage: p.defaultSharePercentage,
  }));
}
