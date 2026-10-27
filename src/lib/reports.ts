import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { finaliseEndedSessions } from "./attendance";
import { addDaysKey, keyToUtcStart } from "./schedule";

/**
 * Everything that goes into one week's report, per enrollment:
 * the sessions (with the student's attendance and the lesson record) and the teacher's written report.
 */
export async function weekDigest(where: Prisma.EnrollmentWhereInput, weekKey: string) {
  const from = keyToUtcStart(weekKey);
  const to = keyToUtcStart(addDaysKey(weekKey, 7));
  await finaliseEndedSessions({ enrollment: where, startsAt: { gte: from, lt: to } });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...where,
      // Active ones, plus any that had lessons or a report that week.
      OR: [
        { status: "ACTIVE" },
        { sessions: { some: { startsAt: { gte: from, lt: to } } } },
        { weeklyReports: { some: { weekStart: new Date(weekKey) } } },
      ],
    },
    include: {
      subject: true,
      level: true,
      teacher: { include: { user: true } },
      student: { include: { user: true, level: true } },
      weeklyReports: { where: { weekStart: new Date(weekKey) }, include: { author: true } },
      sessions: {
        where: { startsAt: { gte: from, lt: to }, status: { not: "RESCHEDULED" } },
        orderBy: { startsAt: "asc" },
        include: { progressNote: true, attendances: true },
      },
    },
    orderBy: [{ student: { user: { firstName: "asc" } } }, { subject: { name: "asc" } }],
  });

  return enrollments.map((e) => {
    const sessions = e.sessions.map((s) => ({
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      cancelReason: s.cancelReason,
      studentAttendance: s.attendances.find((a) => a.userId === e.studentId)?.status ?? null,
      record: s.progressNote,
    }));
    const counted = sessions.filter((s) => s.status === "HELD" || s.status === "MISSED");
    const attended = counted.filter((s) => s.studentAttendance === "PRESENT" || s.studentAttendance === "LATE").length;
    return {
      enrollment: e,
      report: e.weeklyReports[0] ?? null,
      sessions,
      held: sessions.filter((s) => s.status === "HELD").length,
      attended,
      countedForAttendance: counted.length,
    };
  });
}

export type WeekDigest = Awaited<ReturnType<typeof weekDigest>>[number];

export const EFFORT_LABEL = ["", "Needs attention", "Inconsistent", "Steady", "Strong", "Excellent"];
