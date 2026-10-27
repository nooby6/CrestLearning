import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { FINALISE_AFTER_MIN, MAX_HEARTBEAT_GAP_SEC, isLate, joinState, type Participant } from "./classroom";

export type PresenceEvent = "join" | "heartbeat" | "leave";

/**
 * Records a join / heartbeat / leave from the class page and keeps the
 * participant's AUTO attendance up to date. Manual overrides are never touched.
 */
export async function recordPresence(sessionId: number, userId: string, who: Participant, event: PresenceEvent) {
  const now = new Date();
  const session = await prisma.sessionInstance.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Session not found");
  if (joinState(session, who, +now) !== "open" && event === "join") throw new Error("This class isn't open right now.");

  if (event !== "heartbeat") {
    await prisma.sessionJoinEvent.create({
      data: { sessionId, userId, type: event === "join" ? "JOIN" : "LEAVE", at: now },
    });
  }

  const existing = await prisma.attendance.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
  const gapSec = existing?.lastSeenAt ? Math.round((+now - +existing.lastSeenAt) / 1000) : 0;
  const credit = existing?.lastSeenAt && gapSec <= MAX_HEARTBEAT_GAP_SEC ? gapSec : 0;

  if (!existing) {
    if (event === "leave") return null;
    return prisma.attendance.create({
      data: {
        sessionId,
        userId,
        role: who === "teacher" ? "TEACHER" : "STUDENT",
        status: isLate(session.startsAt, now) ? "LATE" : "PRESENT",
        source: "AUTO",
        firstJoinedAt: now,
        lastSeenAt: now,
      },
    });
  }

  const data: Prisma.AttendanceUpdateInput = {
    secondsPresent: { increment: credit },
    lastSeenAt: event === "leave" ? null : now,
    ...(event === "leave" && { lastLeftAt: now }),
  };
  // First real join after being auto-marked absent (e.g. rejoined late) — upgrade it.
  if (existing.source === "AUTO" && event === "join") {
    data.firstJoinedAt = existing.firstJoinedAt ?? now;
    if (existing.status === "ABSENT") data.status = "LATE";
  }
  return prisma.attendance.update({ where: { id: existing.id }, data });
}

/**
 * Closes off sessions that ended more than FINALISE_AFTER_MIN ago:
 *   • teacher attended → HELD, otherwise → MISSED
 *   • anyone with no attendance record gets ABSENT (AUTO)
 * Idempotent and cheap; called from pages and the daily cron.
 */
export async function finaliseEndedSessions(where: Prisma.SessionInstanceWhereInput = {}) {
  const cutoff = new Date(Date.now() - FINALISE_AFTER_MIN * 60_000);
  const due = await prisma.sessionInstance.findMany({
    where: { ...where, status: "SCHEDULED", endsAt: { lt: cutoff } },
    include: { enrollment: true, attendances: true },
    take: 200,
  });

  for (const s of due) {
    const teacherAtt = s.attendances.find((a) => a.userId === s.enrollment.teacherId);
    const studentAtt = s.attendances.find((a) => a.userId === s.enrollment.studentId);
    const held = !!teacherAtt && teacherAtt.status !== "ABSENT";
    await prisma.$transaction([
      prisma.sessionInstance.update({ where: { id: s.id }, data: { status: held ? "HELD" : "MISSED" } }),
      ...(!teacherAtt
        ? [prisma.attendance.create({ data: { sessionId: s.id, userId: s.enrollment.teacherId, role: "TEACHER", status: "ABSENT" } })]
        : []),
      ...(!studentAtt
        ? [prisma.attendance.create({ data: { sessionId: s.id, userId: s.enrollment.studentId, role: "STUDENT", status: "ABSENT" } })]
        : []),
      // Close any dangling "still connected" marker.
      prisma.attendance.updateMany({ where: { sessionId: s.id, lastSeenAt: { not: null } }, data: { lastSeenAt: null } }),
    ]);
  }
  return due.length;
}

/**
 * Sessions a teacher taught (HELD, or attended and already over) that still
 * have no lesson record. These block sign-out and the rest of the portal.
 */
export function pendingRecordsWhere(teacherId: string): Prisma.SessionInstanceWhereInput {
  return {
    enrollment: { teacherId },
    progressNote: null,
    endsAt: { lt: new Date() },
    OR: [
      { status: "HELD" },
      {
        status: "SCHEDULED",
        attendances: { some: { userId: teacherId, status: { in: ["PRESENT", "LATE"] } } },
      },
    ],
  };
}

export async function pendingRecordCount(teacherId: string) {
  await finaliseEndedSessions({ enrollment: { teacherId } });
  return prisma.sessionInstance.count({ where: pendingRecordsWhere(teacherId) });
}
