import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { toSlug, type RoleSlug } from "./roles";

/**
 * Local development only: impersonate a seeded user without Clerk.
 * Set DEV_AUTH_USER_ID=seed_admin (or seed_parent_wanjiru …) in .env.local.
 * Compiled out of production builds because NODE_ENV is "production" there.
 */
export const devImpersonation = (): string | null =>
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_USER_ID
    ? process.env.DEV_AUTH_USER_ID
    : null;

async function resolveUserId(): Promise<string | null> {
  const dev = devImpersonation();
  if (dev) return dev;
  const { userId } = await auth();
  return userId;
}

/**
 * The signed-in user as stored in OUR database. The DB row — not the JWT —
 * is the source of truth for role and active status in server code.
 */
export const getCurrentUser = cache(async () => {
  const userId = await resolveUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Use at the top of every role page and server action. */
export async function requireRole(...allowed: RoleSlug[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.active) redirect("/pending?reason=inactive");
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
