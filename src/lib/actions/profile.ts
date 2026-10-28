"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/roles";
import type { ActionResult } from "@/lib/validation";

const FILE_PREFIX = "/files/";

/** Teachers and administrators set (or remove) their own profile photo. */
export async function setMyPhoto(fileId: string | null): Promise<ActionResult> {
  const me = await getCurrentUser();
  if (!me || !me.active) return { ok: false, error: "Please sign in again." };
  if (me.role !== "TEACHER" && !hasAdminAccess(me)) return { ok: false, error: "Profile photos are for teachers and the office." };

  if (fileId) {
    const f = await prisma.storedFile.findUnique({ where: { id: fileId }, select: { ownerId: true, purpose: true } });
    if (!f || f.ownerId !== me.id || f.purpose !== "avatar") return { ok: false, error: "That photo didn’t upload properly — please try again." };
  }
  const old = me.avatarUrl?.startsWith(FILE_PREFIX) ? me.avatarUrl.slice(FILE_PREFIX.length) : null;
  await prisma.user.update({ where: { id: me.id }, data: { avatarUrl: fileId ? `${FILE_PREFIX}${fileId}` : null } });
  if (old && old !== fileId) await prisma.storedFile.delete({ where: { id: old } }).catch(() => undefined);
  revalidatePath("/", "layout");
  return { ok: true, message: fileId ? "Profile photo updated" : "Profile photo removed" };
}
