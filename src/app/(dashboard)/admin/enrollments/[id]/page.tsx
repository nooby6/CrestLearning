import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { dateKey, formatTime, hoursLabel, weekdayIso } from "@/lib/schedule";
import { Avatar, Badge, Card, DefinitionList, EmptyState } from "@/components/ui/primitives";
import { SessionRow } from "@/components/schedule/SessionRow";
import { SessionActions } from "@/components/schedule/SessionActions";
import { SlotManager, StatusControls } from "./EnrollmentControls";
import { StudentLinkEditor } from "@/components/class/StudentLinkEditor";
import { providerOf } from "@/lib/meeting";

export default async function EnrollmentPage({ params }: { params: { id: string } }) {
  await requireRole("admin");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const now = new Date();
  const e = await prisma.enrollment.findUnique({
    where: { id },
    include: {
      student: { include: { user: true, level: true } },
      teacher: { include: { user: true } },
      subject: true,
      level: true,
      slots: { where: { active: true } },
      sessions: {
        where: { endsAt: { gte: now }, status: { in: ["SCHEDULED", "CANCELLED"] } },
        orderBy: { startsAt: "asc" },
        take: 8,
      },
    },
  });
  if (!e) notFound();

  const [heldCount, recent, upcomingTotal] = await Promise.all([
    prisma.sessionInstance.count({ where: { enrollmentId: id, status: "HELD" } }),
    prisma.sessionInstance.findMany({
      where: { enrollmentId: id, endsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 5,
    }),
    prisma.sessionInstance.count({
      where: { enrollmentId: id, endsAt: { gte: now }, status: { in: ["SCHEDULED", "CANCELLED"] } },
    }),
  ]);

  const slots = [...e.slots].sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday) || a.startTime.localeCompare(b.startTime));
  const weekly = slots.reduce((a, s) => a + s.durationMinutes, 0);
  const statusTone = { ACTIVE: "green", PAUSED: "amber", ENDED: "slate" } as const;

  return (
    <>
      <Link href="/admin/enrollments" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Enrollments
      </Link>

      <div className="card mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href={`/admin/people/${e.studentId}`} className="flex items-center gap-3 rounded-lg pr-2 hover:bg-ivory">
              <Avatar person={e.student.user} />
              <span>
                <span className="block text-xs text-navy-400">Student</span>
                <span className="block font-medium text-navy-900">{fullName(e.student.user)}</span>
              </span>
            </Link>
            <ArrowRight className="h-4 w-4 text-gold-500" />
            <span className="rounded-lg bg-navy-800 px-3 py-2 text-white">
              <span className="block text-[10px] uppercase tracking-wider text-navy-200">Subject</span>
              <span className="block font-display text-sm font-semibold">{e.subject.name}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-gold-500" />
            <Link href={`/admin/people/${e.teacherId}`} className="flex items-center gap-3 rounded-lg pr-2 hover:bg-ivory">
              <Avatar person={e.teacher.user} />
              <span>
                <span className="block text-xs text-navy-400">Teacher</span>
                <span className="block font-medium text-navy-900">{fullName(e.teacher.user)}</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={statusTone[e.status]}>{e.status === "ACTIVE" ? "Active" : e.status === "PAUSED" ? "Paused" : "Ended"}</Badge>
            <StatusControls id={e.id} status={e.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Upcoming sessions"
            description="Generated from the weekly times, six weeks ahead. Move or cancel a single week here."
            bodyClassName="px-5 py-1"
          >
            {e.sessions.length === 0 ? (
              <div className="py-4">
                <EmptyState icon={CalendarDays} title="Nothing coming up">
                  {e.status !== "ACTIVE" ? "This enrollment isn’t active." : "Add a weekly time to start creating sessions."}
                </EmptyState>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {e.sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    href={`/admin/sessions/${s.id}`}
                    startsAt={s.startsAt}
                    endsAt={s.endsAt}
                    title={formatDate(s.startsAt, { weekday: "long", month: "long", year: undefined })}
                    subtitle={s.status === "CANCELLED" ? s.cancelReason ?? "Cancelled" : s.slotId ? undefined : "Moved from its usual time"}
                    colorKey={e.subject.code}
                    status={s.status}
                    action={
                      s.status === "SCHEDULED" && +s.startsAt > Date.now() ? (
                        <SessionActions
                          sessionId={s.id}
                          defaultDate={dateKey(s.startsAt)}
                          defaultTime={formatTime(s.startsAt)}
                          durationMinutes={(+s.endsAt - +s.startsAt) / 60000}
                        />
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
            {upcomingTotal > e.sessions.length && (
              <Link
                href={`/admin/schedule?student=${e.studentId}`}
                className="block border-t border-line py-3 text-center text-xs font-medium text-navy-500 hover:text-navy-800"
              >
                {upcomingTotal - e.sessions.length} more in the schedule →
              </Link>
            )}
          </Card>

          {recent.length > 0 && (
            <Card title="Recent sessions" bodyClassName="px-5 py-1">
              <div className="divide-y divide-line">
                {recent.map((s) => (
                  <SessionRow
                    key={s.id}
                    href={`/admin/sessions/${s.id}`}
                    startsAt={s.startsAt}
                    endsAt={s.endsAt}
                    title={formatDate(s.startsAt, { weekday: "long", month: "long", year: undefined })}
                    colorKey={e.subject.code}
                    status={s.status}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card
            title={`${e.student.user.firstName}’s lesson link`}
            description={e.student.meetingUrl ? "Shared by all of this student’s subjects." : "Required before lessons can be joined online. One link covers all of this student’s subjects."}
          >
            <StudentLinkEditor studentId={e.studentId} url={e.student.meetingUrl} provider={providerOf(e.student.meetingUrl)} />
          </Card>
          <Card title="Weekly times" description={weekly ? `${hoursLabel(weekly)} a week · Nairobi time` : undefined}>
            <SlotManager enrollmentId={e.id} active={e.status === "ACTIVE"} slots={slots} />
          </Card>
          <Card title="Details">
            <DefinitionList
              items={[
                { label: "Curriculum", value: curriculumLabel(e.curriculum) },
                { label: "Level", value: e.level?.name ?? e.student.level?.name ?? "—" },
                { label: "Started", value: formatDate(e.startDate) },
                { label: e.endDate ? "Ended" : "Sessions held", value: e.endDate ? formatDate(e.endDate) : heldCount },
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
