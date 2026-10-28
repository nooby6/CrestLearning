import "server-only";
import prisma from "./prisma";

/** Deletes uploads older than a day that nothing uses (abandoned forms, replaced photos and files). */
export async function removeOrphanFiles(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const avatars = await prisma.user.findMany({ where: { avatarUrl: { startsWith: "/files/" } }, select: { avatarUrl: true } });
  const avatarIds = avatars.map((u) => u.avatarUrl!.slice("/files/".length));
  const { count } = await prisma.storedFile.deleteMany({
    where: { createdAt: { lt: cutoff }, resources: { none: {} }, submissionFiles: { none: {} }, id: { notIn: avatarIds } },
  });
  return count;
}
