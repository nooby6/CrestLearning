import Link from "next/link";
import { CheckCircle2, ClipboardList } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { pendingRecordsWhere } from "@/lib/attendance";
import { formatDate, fullName } from "@/lib/format";
import { formatTimeRange } from "@/lib/schedule";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { LessonRecordForm } from "@/components/class/LessonRecordForm";
import { tintFor } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Lesson records" };

export default async function TeacherRecordsPage() {
  const me = await requireRole("teacher");
  const include = { enrollment: { include: { subject: true, student: { include: { user: true } } } }, attendances: true } as const;

  const [pending, recent] = await Promise.all([
    prisma.sessionInstance.findMany({ where: pendingRecordsWhere(me.id), include, orderBy: { startsAt: "asc" } }),
    prisma.sessionInstance.findMany({
      where: { enrollment: { teacherId: me.id }, progressNote: { isNot: null } },
      include: { ...include, progressNote: true },
      orderBy: { startsAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title="Lesson records"
        description="A short record of what was covered is required after every lesson. It feeds the weekly reports parents receive."
      />

      {pending.length > 0 ? (
        <div className="mb-8 space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
            <p className="font-display text-sm font-semibold text-rose-900">
              {pending.length} {pending.length === 1 ? "lesson needs" : "lessons need"} a record
            </p>
            <p className="mt-0.5 text-xs text-rose-800">
              The rest of the portal, and signing out, are available once these are complete.
            </p>
          </div>
          {pending.map((s) => (
            <Card
              key={s.id}
              title={
                <span className="flex items-center gap-2">
                  <span className={`h-4 w-1 rounded-full border-l-[3px] ${tintFor(s.enrollment.subject.code)}`} />
                  {s.enrollment.subject.name} · {fullName(s.enrollment.student.user)}
                </span>
              }
              description={`${formatDate(s.startsAt, { weekday: "long", year: undefined })} · ${formatTimeRange(s.startsAt, s.endsAt)}`}
              action={
                <Link href={`/teacher/sessions/${s.id}?from=records`} className="text-xs font-medium text-navy-500 hover:text-navy-800">
                  Attendance →
                </Link>
              }
            >
              <LessonRecordForm
                sessionId={s.id}
                existing={null}
                studentName={s.enrollment.student.user.firstName}
                studentAttendance={s.attendances.find((a) => a.userId === s.enrollment.studentId)?.status ?? null}
              />
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-8">
          <EmptyState icon={CheckCircle2} title="All lesson records are complete">
            Thank you. New lessons appear here as soon as they finish.
          </EmptyState>
        </div>
      )}

      <Card title="Recently recorded" bodyClassName="px-5 py-1">
        {recent.length === 0 ? (
          <div className="py-4">
            <EmptyState icon={ClipboardList} title="No records yet" />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/teacher/sessions/${s.id}?from=records`} className="block py-3 hover:bg-ivory/60">
                  <p className="text-xs text-navy-400">
                    {formatDate(s.startsAt, { weekday: "short", year: undefined })} · {s.enrollment.subject.name} ·{" "}
                    {fullName(s.enrollment.student.user)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-navy-800">{s.progressNote?.topicsCovered}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
