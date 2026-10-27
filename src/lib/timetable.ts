import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { addDaysKey, keyToUtcStart } from "./schedule";
import type { GridSession } from "@/components/schedule/WeekGrid";

const short = (u: { firstName: string; lastName: string }) => `${u.firstName} ${u.lastName[0] ?? ""}.`;

/**
 * Sessions for one week (Mon key), shaped for <WeekGrid>.
 * `subtitle` shows the other party depending on who is looking.
 */
export async function weekSessions(
  weekKey: string,
  where: Prisma.EnrollmentWhereInput,
  viewer: "admin" | "teacher" | "student" | "parent",
  href?: (s: { id: number; enrollmentId: number }) => string,
): Promise<GridSession[]> {
  const from = keyToUtcStart(weekKey);
  const to = keyToUtcStart(addDaysKey(weekKey, 7));
  const rows = await prisma.sessionInstance.findMany({
    where: { startsAt: { gte: from, lt: to }, enrollment: where },
    include: {
      enrollment: {
        include: { subject: true, student: { include: { user: true } }, teacher: { include: { user: true } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((s) => {
    const e = s.enrollment;
    const subtitle =
      viewer === "teacher"
        ? short(e.student.user)
        : viewer === "student"
          ? short(e.teacher.user)
          : viewer === "parent"
            ? `${e.student.user.firstName} · ${short(e.teacher.user)}`
            : `${short(e.student.user)} · ${short(e.teacher.user)}`;
    return {
      id: s.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      status: s.status,
      title: e.subject.name,
      subtitle,
      colorKey: e.subject.code,
      href: href?.(s),
    };
  });
}
