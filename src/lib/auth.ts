import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import prisma from "./prisma";
import { sessionUserId } from "./session";
import { toSlug, type RoleSlug } from "./roles";

/**
 * Local development only: impersonate a seeded user without signing in.
 * Set DEV_AUTH_USER_ID=seed_admin (or seed_parent_wanjiru …) in .env.
 * Never active in production builds because NODE_ENV is "production" there.
 */
export const devImpersonation = (): string | null =>
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_USER_ID ? process.env.DEV_AUTH_USER_ID : null;

/** The signed-in user (from the session cookie), as stored in the database. */
export const getCurrentUser = cache(async () => {
  const userId = devImpersonation() ?? (await sessionUserId());
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Use at the top of every role page. */
export async function requireRole(...allowed: RoleSlug[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.active) redirect("/pending?reason=inactive");
  if (user.mustChangePassword && !devImpersonation()) redirect("/account/password?first=1");
  const slug = toSlug(user.role);
  if (allowed.length && !allowed.includes(slug)) redirect(`/${slug}`);
  return user;
}

/** Server-action variant: throws instead of redirecting. */
export async function assertRole(...allowed: RoleSlug[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !user.active || !allowed.includes(toSlug(user.role))) {
    throw new Error("You do not have permission to do that.");
  }
  return user;
}
