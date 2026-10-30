"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole, getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/validation";

const refresh = () => {
  for (const p of ["/admin", "/teacher", "/parent", "/student"]) revalidatePath(p, "layout");
};

const Input = z.object({
  title: z.string().trim().min(3, "Add a title").max(140),
  body: z.string().trim().min(3, "Write the announcement").max(5000),
  audience: z.enum(["EVERYONE", "TEACHERS", "PARENTS", "SPECIFIC_PARENTS"]),
  parentIds: z.array(z.string()).max(500).default([]),
  pinned: z.boolean().default(false),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function postAnnouncement(input: z.input<typeof Input>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = Input.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;

  const where =
    d.audience === "EVERYONE"
      ? { active: true }
      : d.audience === "TEACHERS"
        ? { active: true, role: "TEACHER" as const }
        : d.audience === "PARENTS"
          ? { active: true, role: "PARENT" as const }
          : { active: true, role: "PARENT" as const, id: { in: d.parentIds } };
  if (d.audience === "SPECIFIC_PARENTS" && !d.parentIds.length) return { ok: false, error: "Choose at least one parent." };
  const recipients = (await prisma.user.findMany({ where, select: { id: true } })).map((u) => u.id);
  if (!recipients.length) return { ok: false, error: "Nobody matches that audience yet." };

  await prisma.announcement.create({
    data: {
      title: d.title,
      body: d.body,
      audience: d.audience,
      pinned: d.pinned,
      authorId: me.id,
      expiresAt: d.expiresOn ? new Date(`${d.expiresOn}T23:59:59+03:00`) : null,
      recipients: { create: recipients.map((userId) => ({ userId, readAt: userId === me.id ? new Date() : null })) },
    },
  });
  refresh();
  return { ok: true, message: `Announcement sent to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}` };
}

export async function deleteAnnouncement(id: number): Promise<ActionResult> {
  await assertRole("admin");
  await prisma.announcement.delete({ where: { id } }).catch(() => undefined);
  refresh();
  return { ok: true, message: "Announcement removed" };
}

export async function togglePin(id: number): Promise<ActionResult> {
  await assertRole("admin");
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) return { ok: false, error: "Announcement not found." };
  await prisma.announcement.update({ where: { id }, data: { pinned: !a.pinned } });
  refresh();
  return { ok: true, message: a.pinned ? "Unpinned" : "Pinned to the top" };
}

/** Marks everything the current user can see as read (called when they open their announcements). */
export async function markAllRead(): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.announcementRecipient.updateMany({ where: { userId: me.id, readAt: null }, data: { readAt: new Date() } });
  refresh();
}
