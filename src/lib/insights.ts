import "server-only";
import prisma from "./prisma";
import { addDaysKey, dateKey, keyToUtcStart, mondayOf } from "./schedule";

export type WeekPoint = { key: string; label: string; held: number; missed: number; attendance: number | null };
export type Bar = { label: string; value: number; sub?: string; href?: string };
export type LoadBar = { id: string; label: string; bookedMinutes: number; capacityMinutes: number };

const WEEKS = 8;
const shortDate = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", timeZone: "UTC" });

/** Everything the admin overview charts need, computed in a few queries. */
export async function adminInsights() {
  const thisMonday = mondayOf(dateKey(new Date()));
  const keys = Array.from({ length: WEEKS }, (_, i) => addDaysKey(thisMonday, (i - (WEEKS - 1)) * 7));
  const from = keyToUtcStart(keys[0]);
  const to = keyToUtcStart(addDaysKey(thisMonday, 7));

  const [sessions, studentMarks, bySubject, subjects, teachers] = await Promise.all([
    prisma.sessionInstance.findMany({
      where: { startsAt: { gte: from, lt: to }, status: { in: ["HELD", "MISSED"] } },
      select: { startsAt: true, status: true },
    }),
    prisma.attendance.findMany({
      where: { role: "STUDENT", session: { startsAt: { gte: from, lt: to } } },
      select: { status: true, session: { select: { startsAt: true } } },
    }),
    prisma.enrollment.groupBy({ by: ["subjectId"], where: { status: "ACTIVE" }, _count: { _all: true } }),
    prisma.subject.findMany({ select: { id: true, name: true } }),
    prisma.teacher.findMany({
      where: { user: { active: true } },
      select: {
        id: true,
        weeklyCapacityHours: true,
        user: { select: { firstName: true, lastName: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          select: { slots: { where: { active: true }, select: { durationMinutes: true } } },
        },
      },
    }),
  ]);

  const weekOf = (d: Date) => mondayOf(dateKey(d));
  const weeks: WeekPoint[] = keys.map((key) => ({
    key,
    label: key === thisMonday ? "This week" : shortDate.format(new Date(`${key}T00:00:00Z`)),
    held: 0,
    missed: 0,
    attendance: null,
  }));
  const byKey = new Map(weeks.map((w) => [w.key, w]));
  for (const s of sessions) {
    const w = byKey.get(weekOf(s.startsAt));
    if (!w) continue;
    if (s.status === "HELD") w.held++;
    else w.missed++;
  }
  const marks = new Map<string, { present: number; total: number }>();
  for (const a of studentMarks) {
    if (a.status === "EXCUSED") continue;
    const k = weekOf(a.session.startsAt);
    const m = marks.get(k) ?? { present: 0, total: 0 };
    m.total++;
    if (a.status === "PRESENT" || a.status === "LATE") m.present++;
    marks.set(k, m);
  }
  for (const w of weeks) {
    const m = marks.get(w.key);
    w.attendance = m && m.total ? Math.round((m.present / m.total) * 100) : null;
  }

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const subjectBars: Bar[] = bySubject
    .map((g) => ({ label: subjectName.get(g.subjectId) ?? "—", value: g._count._all }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  const load: LoadBar[] = teachers
    .map((t) => ({
      id: t.id,
      label: `${t.user.firstName} ${t.user.lastName}`,
      bookedMinutes: t.enrollments.reduce((sum, e) => sum + e.slots.reduce((s, x) => s + x.durationMinutes, 0), 0),
      capacityMinutes: t.weeklyCapacityHours * 60,
    }))
    .sort((a, b) => b.bookedMinutes / (b.capacityMinutes || 1) - a.bookedMinutes / (a.capacityMinutes || 1));

  return { weeks, subjectBars, load };
}
