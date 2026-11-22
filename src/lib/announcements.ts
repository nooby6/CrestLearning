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

/** Everything this person hasn't opened yet, newest first. Drives the alert at the top of every portal page. */
export async function unreadAnnouncementItems(userId: string) {
  const rows = await prisma.announcementRecipient.findMany({
    where: { userId, readAt: null, announcement: live() },
    select: {
      announcement: {
        select: { id: true, title: true, body: true, pinned: true, publishedAt: true, author: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: [{ announcement: { pinned: "desc" } }, { announcement: { publishedAt: "desc" } }],
    take: 20,
  });
  return rows.map((r) => ({
    id: r.announcement.id,
    title: r.announcement.title,
    body: r.announcement.body,
    pinned: r.announcement.pinned,
    publishedAt: r.announcement.publishedAt.toISOString(),
    author: `${r.announcement.author.firstName} ${r.announcement.author.lastName}`,
  }));
}

export const unreadAnnouncements = (userId: string) => prisma.announcementRecipient.count({ where: { userId, readAt: null, announcement: live() } });

export const AUDIENCE_LABEL = {
  EVERYONE: "Everyone",
  TEACHERS: "Teachers",
  PARENTS: "All parents",
  SPECIFIC_PARENTS: "Selected parents",
} as const;
