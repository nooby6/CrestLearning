import "server-only";
import prisma from "./prisma";
import { databaseConfigured } from "./env";
import { hashPassword } from "./password-hash";
import { ensureCatalogue } from "./catalogue";

/**
 * Creates the first administrator from environment variables, so the owner
 * never has to fill in a setup form:
 *   BOOTSTRAP_ADMIN_USERNAME (default "admin"), BOOTSTRAP_ADMIN_PASSWORD (required),
 *   BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_FIRST_NAME, BOOTSTRAP_ADMIN_LAST_NAME (optional).
 * Runs only while no administrator exists, so it is a no-op afterwards
 * (changing the variables later never resets anyone's password).
 */
export async function ensureBootstrapAdmin(): Promise<boolean> {
  if (!databaseConfigured()) return false;
  try {
    await ensureCatalogue();
  } catch (err) {
    console.error("[bootstrap] could not load subjects:", err);
  }
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!password) return false;
  try {
    if (await prisma.user.count({ where: { role: "ADMIN" } })) return false;
    const username = (process.env.BOOTSTRAP_ADMIN_USERNAME || "admin").trim().toLowerCase();
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;
    await prisma.user.upsert({
      where: { username },
      update: { role: "ADMIN", active: true, passwordHash: await hashPassword(password) },
      create: {
        role: "ADMIN",
        username,
        email,
        firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME?.trim() || "Crest",
        lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME?.trim() || "Administrator",
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    console.log(`[bootstrap] administrator "${username}" created`);
    return true;
  } catch (err) {
    console.error("[bootstrap] could not create administrator:", err);
    return false;
  }
}
