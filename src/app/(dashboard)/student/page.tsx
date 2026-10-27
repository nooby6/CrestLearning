import Link from "next/link";
import { ArrowRight, CalendarDays, Video } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { dateKey, formatTimeRange } from "@/lib/schedule";
import { Card, ComingNext, EmptyState, PageHeader } from "@/components/ui/primitives";
import { tintFor } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Home" };

function relativeDay(d: Date) {
  const k = dateKey(d);
  const today = dateKey(new Date());
  const tomorrow = dateKey(new Date(Date.now() + 86_400_000));
  return k === today ? "Today" : k === tomorrow ? "Tomorrow" : formatDate(d, { weekday: "long", year: undefined });
}

export default async function StudentHome() {
  const me = await requireRole("student");
  const now = new Date();
  const [s, upcoming] = await Promise.all([
    prisma.student.findUnique({
      where: { id: me.id },
      include: {
        level: true,
        enrollments: {
          where: { status: "ACTIVE" },
          include: { subject: true, teacher: { include: { user: true } } },
          orderBy: { subject: { name: "asc" } },
        },
      },
    }),
    prisma.sessionInstance.findMany({
      where: { enrollment: { studentId: me.id }, status: "SCHEDULED", endsAt: { gt: now } },
      include: { enrollment: { include: { subject: true, teacher: { include: { user: true } } } } },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);
  const [next, ...later] = upcoming;
  const live = next && +next.startsAt <= Date.now();

  return (
    <>
      <PageHeader
        eyebrow={[curriculumLabel(s?.curriculum), s?.level?.name].filter((x) => x && x !== "—").join(" · ") || "Student portal"}
        title={`${greeting()}, ${me.firstName}`}
        description="Your classes, resources and homework live here."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {next ? (
            <section className="card overflow-hidden">
              <div className="relative bg-navy-800 px-6 py-6 text-white">
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[10px] border-white/[0.05]" />
                <p className="eyebrow text-gold-400">{live ? "Happening now" : "Next class"}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">{next.enrollment.subject.name}</h2>
                <p className="mt-1 text-sm text-navy-200">
                  {relativeDay(next.startsAt)} · {formatTimeRange(next.startsAt, next.endsAt)} · with {fullName(next.enrollment.teacher.user)}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="btn cursor-not-allowed bg-white/10 text-navy-100" aria-disabled>
                    <Video className="h-4 w-4 text-gold-400" /> Join class
                  </span>
                  <span className="text-xs text-navy-300">The join button goes live with online classes (Module 3).</span>
                </div>
              </div>
              {later.length > 0 && (
                <ul className="divide-y divide-line">
                  {later.map((x) => (
                    <li key={x.id} className="flex items-center gap-4 px-6 py-3">
                      <span className={`h-8 w-1 rounded-full border-l-[3px] ${tintFor(x.enrollment.subject.code)}`} />
                      <div className="w-28 shrink-0 text-xs text-navy-400">{relativeDay(x.startsAt)}</div>
                      <div className="flex-1 text-sm font-medium text-navy-900">{x.enrollment.subject.name}</div>
                      <div className="text-xs tabular-nums text-navy-500">{formatTimeRange(x.startsAt, x.endsAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <Card title="Next class">
              <EmptyState icon={Video} title="No classes scheduled yet">
                When your timetable is set, your next class shows here with a “Join class” button.
              </EmptyState>
            </Card>
          )}
        </div>
        <Card
          title="My subjects"
          action={
            <Link href="/student/timetable" className="flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-800">
              <CalendarDays className="h-3.5 w-3.5" /> Timetable <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {s?.enrollments.length ? (
            <ul className="space-y-2.5 text-sm">
              {s.enrollments.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className={`h-5 w-1 rounded-full border-l-[3px] ${tintFor(e.subject.code)}`} />
                  <span className="flex-1 font-medium">{e.subject.name}</span>
                  <span className="text-navy-500">{fullName(e.teacher.user)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-navy-400">Your subjects will show here once you’re enrolled.</p>
          )}
        </Card>
      </div>
      <div className="mt-6">
        <ComingNext module="Module 4 · Resources & homework">Notes and files from your teachers, only for your subjects and level.</ComingNext>
      </div>
    </>
  );
}
