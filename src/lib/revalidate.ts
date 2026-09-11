import { revalidatePath } from "next/cache";

/**
 * Revalidates all core financial and view routes across the application.
 * Guarantees that any mutate operation (payments, expenses, partners, projects, drawings, bills)
 * immediately purges stale cache so all views are guaranteed up to date.
 */
export function revalidateSystem(extraPath?: string) {
  revalidatePath("/", "page");
  revalidatePath("/projects", "page");
  revalidatePath("/partners", "page");
  revalidatePath("/company", "page");
  revalidatePath("/ledger", "page");
  revalidatePath("/summary", "page");
  revalidatePath("/capital", "page");
  if (extraPath) {
    revalidatePath(extraPath, "page");
  }
}
