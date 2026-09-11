/**
 * Seed (or reset) the admin login account.
 * Usage: $env:ADMIN_USERNAME="admin"; $env:ADMIN_PASSWORD="<strong-secret>"; npm run db:seed-admin
 *
 * Upserts a single `users` row — safe to re-run when rotating the password.
 */
import "dotenv/config";
import { prisma as db } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

async function main() {
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!username) throw new Error("ADMIN_USERNAME is empty.");
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }
  const user = await db.user.upsert({
    where: { username },
    update: { passwordHash: hashPassword(password), role: "admin" },
    create: { username, passwordHash: hashPassword(password), role: "admin" },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  console.log(`✓ Admin account ready: ${user.username} (role=${user.role})`);
}

main()
  .catch((e) => {
    console.error("✗ Seed admin FAILED:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
