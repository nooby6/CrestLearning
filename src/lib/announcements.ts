import "server-only";
import prisma from "./prisma";

/** Announcements reach people through recipient rows created when posted (which also track who has read them). */
const live = () => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] });

export async function announcementsFor(userId: string, take = 50) {
  const rows = await prisma.announcementRecipient.findMany({
    where: { userId, announcement: live() },
    include: { announcement: { include: { author: { select: { firstName: true, lastName: true, avatarUrl: true, id: true } } } } },
    orderBy: [{ announcement: { pinned: "desc" } }, { announcement: { publishedAt: "desc" } }],
    take,
  });
  return rows.map((r) => ({ ...r.announcement, readAt: r.readAt }));
}

export const unreadAnnouncements = (userId: string) => prisma.announcementRecipient.count({ where: { userId, readAt: null, announcement: live() } });

export const AUDIENCE_LABEL = {
  EVERYONE: "Everyone",
  TEACHERS: "Teachers",
  PARENTS: "All parents",
  SPECIFIC_PARENTS: "Selected parents",
} as const;
