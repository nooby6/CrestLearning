import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarDays, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { addDaysKey, dateKey, formatTime, hoursLabel, keyToUtcStart, mondayOf } from "@/lib/schedule";
import { Badge, Card, ComingNext, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { SessionRow } from "@/components/schedule/SessionRow";
import { JoinButton } from "@/components/class/JoinButton";
import { sessionLink } from "@/lib/meeting";

export const metadata = { title: "Today" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function TeacherHome() {
  const me = await requireRole("teacher");
  const todayKey = dateKey(new Date());
  const dayStart = keyToUtcStart(todayKey);
  const dayEnd = keyToUtcStart(addDaysKey(todayKey, 1));
  const weekKey = mondayOf(todayKey);

  const sessionInclude = {
    enrollment: { include: { subject: true, student: { include: { user: true } }, level: true } },
    progressNote: { select: { id: true } },
  } as const;

  const lastWeek = addDaysKey(weekKey, -7);
  const [t, today, upcoming, weekMinutes, reportsMissing] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: me.id },
      include: {
        subjects: { include: { subject: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.sessionInstance.findMany({
      where: { enrollment: { teacherId: me.id }, startsAt: { gte: dayStart, lt: dayEnd }, status: { not: "RESCHEDULED" } },
      include: sessionInclude,
      orderBy: { startsAt: "asc" },
    }),
    prisma.sessionInstance.findMany({
      where: { enrollment: { teacherId: me.id }, startsAt: { gte: dayEnd }, status: "SCHEDULED" },
      include: sessionInclude,
      orderBy: { startsAt: "asc" },
      take: 5,
    }),
    prisma.sessionInstance.findMany({
      where: {
        enrollment: { teacherId: me.id },
        status: { in: ["SCHEDULED", "HELD"] },
        startsAt: { gte: keyToUtcStart(weekKey), lt: keyToUtcStart(addDaysKey(weekKey, 7)) },
      },
      select: { startsAt: true, endsAt: true },
    }),
    // Last week's reports are due by Sunday — flag any still missing.
    prisma.enrollment.count({
      where: {
        teacherId: me.id,
        sessions: { some: { status: "HELD", startsAt: { gte: keyToUtcStart(lastWeek), lt: keyToUtcStart(weekKey) } } },
        weeklyReports: { none: { weekStart: new Date(lastWeek) } },
      },
    }),
  ]);

  const weekMins = weekMinutes.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 60000, 0);
  const remaining = today.filter((s) => s.status === "SCHEDULED" && +s.endsAt > Date.now()).length;

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: undefined })}
        title={`${greeting()}, ${me.firstName}`}
        description={
          today.length
            ? remaining
              ? remaining === today.length
                ? `${plural(today.length, "session")} today.`
                : `${remaining} of ${plural(today.length, "session")} still to go today.`
              : "All of today’s sessions are done."
            : "No sessions today."
        }
      />

      {reportsMissing > 0 && (
        <Link
          href={`/teacher/reports?week=${lastWeek}`}
          className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900 hover:bg-amber-100/60"
        >
          <span>
            <span className="font-semibold">
              {reportsMissing} weekly {reportsMissing === 1 ? "report" : "reports"} overdue
            </span>{" "}
            for last week. Parents are waiting for them.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today"
          value={today.filter((s) => s.status !== "CANCELLED").length}
          hint={today.filter((s) => s.status !== "CANCELLED").length === 1 ? "session" : "sessions"}
          icon={CalendarClock}
        />
        <StatCard tone="gold" label="This week" value={hoursLabel(weekMins)} hint={`of ${t?.weeklyCapacityHours ?? 0} h available`} icon={CalendarDays} href="/teacher/timetable" />
        <StatCard tone="teal" label="Students" value={t?._count.enrollments ?? 0} hint="active enrollments" icon={Users} href="/teacher/students" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Today’s sessions" className="lg:col-span-2" bodyClassName="px-5 py-1">
          {today.length === 0 ? (
            <div className="py-4">
              <EmptyState icon={CalendarClock} title="Nothing scheduled today">
                Your next session is {upcoming[0] ? `${formatDate(upcoming[0].startsAt, { weekday: "long", year: undefined })} at ${formatTime(upcoming[0].startsAt)}` : "not booked yet"}.
              </EmptyState>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {today.map((s) => (
                <SessionRow
                  key={s.id}
                  startsAt={s.startsAt}
                  endsAt={s.endsAt}
                  href={`/teacher/sessions/${s.id}`}
                  title={`${s.enrollment.subject.name} · ${fullName(s.enrollment.student.user)}`}
                  subtitle={
                    s.status === "CANCELLED"
                      ? s.cancelReason ?? "Cancelled"
                      : s.progressNote
                        ? "Lesson record complete"
                        : s.enrollment.level?.name
                  }
                  colorKey={s.enrollment.subject.code}
                  status={s.status}
                  action={
                    s.status === "SCHEDULED" ? (
                      <JoinButton
                        sessionId={s.id}
                        startsAt={s.startsAt.toISOString()}
                        endsAt={s.endsAt.toISOString()}
                        status={s.status}
                        who="teacher"
                        size="sm"
                        tone="navy"
                        external={!!sessionLink(s)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Coming up"
          action={
            <Link href="/teacher/timetable" className="flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-800">
              Timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
          bodyClassName="px-5 py-1"
        >
          {upcoming.length === 0 ? (
            <p className="py-4 text-sm text-navy-400">Nothing else booked.</p>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((s) => (
                <li key={s.id} className="py-3">
                  <p className="text-xs text-navy-400">
                    {formatDate(s.startsAt, { weekday: "short", year: undefined })} · {formatTime(s.startsAt)}
                  </p>
                  <p className="text-sm font-medium text-navy-900">
                    {s.enrollment.subject.name} <span className="font-normal text-navy-500">· {s.enrollment.student.user.firstName}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
          {t && t.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-line py-3">
              {t.subjects.map((s) => (
                <Badge key={s.subjectId}>{s.subject.name}</Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ComingNext module="Module 4 · Resources">Upload notes and worksheets for a student, or for every student at a subject and level.</ComingNext>
        <ComingNext module="Module 5 · Payouts">Monthly payout statements calculated from the lessons you have held.</ComingNext>
      </div>
    </>
  );
}
