import Link from "next/link";
import { ArrowRight, BookOpenCheck, Video } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { dateKey, dbDateKey, formatTimeRange } from "@/lib/schedule";
import { lessonSummary } from "@/lib/lesson-summary";
import { Card, ComingNext, EmptyState, PageHeader } from "@/components/ui/primitives";
import { JoinButton } from "@/components/class/JoinButton";
import { LessonOverview } from "@/components/class/LessonOverview";
import { sessionLink } from "@/lib/meeting";

export const metadata = { title: "Home" };

function dayLabel(d: Date) {
  const k = dateKey(d);
  if (k === dateKey(new Date())) return "Today";
  if (k === dateKey(new Date(Date.now() + 86_400_000))) return "Tomorrow";
  return formatDate(d, { weekday: "long", year: undefined });
}

export default async function StudentHome() {
  const me = await requireRole("student");
  const now = new Date();
  const [s, summaries, next, homework] = await Promise.all([
    prisma.student.findUnique({ where: { id: me.id }, include: { level: true } }),
    lessonSummary([me.id]),
    prisma.sessionInstance.findFirst({
      where: { enrollment: { studentId: me.id }, status: "SCHEDULED", endsAt: { gt: now } },
      include: { enrollment: { include: { subject: true, teacher: { include: { user: true } }, student: { select: { meetingUrl: true } } } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.progressNote.findMany({
      where: { session: { enrollment: { studentId: me.id } }, homework: { not: null }, OR: [{ homeworkDue: null }, { homeworkDue: { gte: new Date(dateKey(now)) } }] },
      include: { session: { include: { enrollment: { include: { subject: true } } } } },
      orderBy: [{ homeworkDue: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);
  const summary = summaries[me.id];

  return (
    <>
      <PageHeader
        eyebrow={[curriculumLabel(s?.curriculum), s?.level?.name].filter((x) => x && x !== "—").join(" · ") || "Student portal"}
        title={`${greeting()}, ${me.firstName}`}
        description={
          summary.todayLeft
            ? `You have ${summary.todayLeft} ${summary.todayLeft === 1 ? "lesson" : "lessons"} left today.`
            : summary.weekLeft
              ? `No more lessons today · ${summary.weekLeft} left this week.`
              : "No more lessons this week."
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {next ? (
            <section className="card relative overflow-hidden bg-navy-800 px-6 py-6 text-white">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border-[10px] border-white/[0.05]" />
              <p className="eyebrow text-gold-400">Next lesson</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{next.enrollment.subject.name}</h2>
              <p className="mt-1 text-sm text-navy-200">
                {dayLabel(next.startsAt)} · {formatTimeRange(next.startsAt, next.endsAt)} · with {fullName(next.enrollment.teacher.user)}
              </p>
              <div className="mt-5">
                <JoinButton sessionId={next.id} startsAt={next.startsAt.toISOString()} endsAt={next.endsAt.toISOString()} status={next.status} who="student" external={!!sessionLink(next)} />
              </div>
            </section>
          ) : (
            <Card title="Next lesson">
              <EmptyState icon={Video} title="No lessons scheduled">
                Your next lesson appears here, with a Join button that opens ten minutes before it starts.
              </EmptyState>
            </Card>
          )}

          <Card title="My lessons">
            <LessonOverview s={summary} viewer="student" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Homework"
            action={
              <Link href="/student/homework" className="flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-800">
                All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
            bodyClassName="px-5 py-1"
          >
            {homework.length === 0 ? (
              <div className="py-4">
                <EmptyState icon={BookOpenCheck} title="No homework due">
                  Homework set in your lessons will appear here.
                </EmptyState>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {homework.map((h) => (
                  <li key={h.id} className="py-3">
                    <p className="text-xs text-navy-400">
                      {h.session.enrollment.subject.name}
                      {h.homeworkDue && ` · due ${formatDate(new Date(dbDateKey(h.homeworkDue)), { weekday: "short", year: undefined })}`}
                    </p>
                    <p className="text-sm text-navy-900">{h.homework}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <ComingNext module="Module 4 · Resources">Notes and files from your teachers, for your subjects and level only.</ComingNext>
        </div>
      </div>
    </>
  );
}
