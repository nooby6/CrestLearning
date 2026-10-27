import Link from "next/link";
import clsx from "clsx";
import { CalendarPlus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { weeklyLoadByTeacher } from "@/lib/sessions";
import { hoursLabel } from "@/lib/schedule";
import { weekSessions } from "@/lib/timetable";
import { Avatar, Card, PageHeader } from "@/components/ui/primitives";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { WeekGrid, WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Schedule" };

type SP = { week?: string; teacher?: string; student?: string };

export default async function AdminSchedulePage({ searchParams }: { searchParams: SP }) {
  await requireRole("admin");
  const weekKey = resolveWeek(searchParams.week);

  const where: Prisma.EnrollmentWhereInput = {
    ...(searchParams.teacher && { teacherId: searchParams.teacher }),
    ...(searchParams.student && { studentId: searchParams.student }),
  };

  const [sessions, teachers, students, load] = await Promise.all([
    weekSessions(weekKey, where, "admin", (s) => `/admin/enrollments/${s.enrollmentId}`),
    prisma.teacher.findMany({ where: { user: { active: true } }, include: { user: true }, orderBy: { user: { firstName: "asc" } } }),
    prisma.student.findMany({ where: { user: { active: true } }, include: { user: true }, orderBy: { user: { firstName: "asc" } } }),
    weeklyLoadByTeacher(),
  ]);

  const scheduled = sessions.filter((s) => s.status === "SCHEDULED" || s.status === "HELD");
  const minutes = scheduled.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 60000, 0);

  return (
    <>
      <PageHeader
        eyebrow="Scheduling"
        title="Schedule"
        description={`${scheduled.length} sessions · ${hoursLabel(minutes)} of teaching this week. Click a session to open its enrollment.`}
        actions={
          <Link href="/admin/enrollments/new" className="btn-primary">
            <CalendarPlus className="h-4 w-4" /> New enrollment
          </Link>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_280px]">
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <WeekNav weekKey={weekKey} basePath="/admin/schedule" params={{ teacher: searchParams.teacher, student: searchParams.student }} />
            <div className="flex flex-wrap gap-2">
              <FilterSelect param="teacher" label="Teacher" allLabel="All teachers" options={teachers.map((t) => ({ value: t.id, label: fullName(t.user) }))} />
              <FilterSelect param="student" label="Student" allLabel="All students" options={students.map((s) => ({ value: s.id, label: fullName(s.user) }))} />
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <WeekGrid weekKey={weekKey} sessions={sessions} />
          </div>
        </div>

        <Card title="Teacher load" description="Booked weekly hours against each teacher’s capacity." bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {teachers
              .map((t) => ({ t, mins: load.get(t.id) ?? 0, cap: t.weeklyCapacityHours * 60 }))
              .sort((a, b) => b.mins / b.cap - a.mins / a.cap)
              .map(({ t, mins, cap }) => {
                const pct = cap ? Math.round((mins / cap) * 100) : 0;
                const tone = pct > 100 ? "bg-rose-500" : pct >= 85 ? "bg-amber-500" : "bg-gold-500";
                return (
                  <li key={t.id}>
                    <Link
                      href={`/admin/schedule?teacher=${t.id}${searchParams.week ? `&week=${searchParams.week}` : ""}`}
                      className={clsx("block px-5 py-3 transition hover:bg-ivory", searchParams.teacher === t.id && "bg-navy-50/60")}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar person={t.user} size="sm" />
                        <span className="flex-1 truncate text-sm font-medium text-navy-900">{fullName(t.user)}</span>
                        <span className={clsx("text-xs font-semibold tabular-nums", pct > 100 ? "text-rose-600" : "text-navy-500")}>{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-50">
                        <div className={clsx("h-full rounded-full", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] tabular-nums text-navy-400">
                        {hoursLabel(mins)} of {t.weeklyCapacityHours} h
                      </p>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </Card>
      </div>
    </>
  );
}
