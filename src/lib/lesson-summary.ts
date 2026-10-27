import "server-only";
import prisma from "./prisma";
import { addDaysKey, dateKey, keyToUtcStart, mondayOf, weekdayIso } from "./schedule";

/**
 * What students and parents need at a glance — counts of lessons, not hours:
 * today's lessons (time, subject, teacher), how many remain this week, and the weekly pattern.
 */
export async function lessonSummary(studentIds: string[]) {
  const todayKey = dateKey(new Date());
  const weekKey = mondayOf(todayKey);
  const now = new Date();

  const [weekSessions, enrollments] = await Promise.all([
    prisma.sessionInstance.findMany({
      where: {
        enrollment: { studentId: { in: studentIds } },
        startsAt: { gte: keyToUtcStart(weekKey), lt: keyToUtcStart(addDaysKey(weekKey, 7)) },
        status: { notIn: ["RESCHEDULED"] },
      },
      include: { enrollment: { include: { subject: true, teacher: { include: { user: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, status: "ACTIVE" },
      include: { subject: true, teacher: { include: { user: true } }, slots: { where: { active: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
  ]);

  return Object.fromEntries(
    studentIds.map((id) => {
      const mine = weekSessions.filter((s) => s.enrollment.studentId === id);
      const live = mine.filter((s) => s.status !== "CANCELLED");
      const today = mine.filter((s) => dateKey(s.startsAt) === todayKey);
      const todayLeft = today.filter((s) => s.status === "SCHEDULED" && s.endsAt > now);
      const weekLeft = live.filter((s) => s.status === "SCHEDULED" && s.endsAt > now);
      const weekly = enrollments
        .filter((e) => e.studentId === id)
        .flatMap((e) =>
          e.slots.map((sl) => ({
            key: `${e.id}-${sl.id}`,
            subject: e.subject.name,
            code: e.subject.code,
            teacher: e.teacher.user,
            weekday: sl.weekday,
            startTime: sl.startTime,
            durationMinutes: sl.durationMinutes,
          })),
        )
        .sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday) || a.startTime.localeCompare(b.startTime));
      return [
        id,
        {
          today,
          todayLeft: todayLeft.length,
          weekTotal: live.length,
          weekLeft: weekLeft.length,
          next: weekLeft[0] ?? null,
          weekly,
        },
      ];
    }),
  );
}

export type LessonSummary = Awaited<ReturnType<typeof lessonSummary>>[string];
