import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CalendarCheck2, ClipboardX, UserCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { finaliseEndedSessions } from "@/lib/attendance";
import { ATTENDANCE_LABEL } from "@/lib/classroom";
import { formatDate, fullName } from "@/lib/format";
import { formatTime } from "@/lib/schedule";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";

export const metadata = { title: "Attendance" };

const RANGES = [7, 14, 30];
const TONE = { PRESENT: "green", LATE: "amber", ABSENT: "rose", EXCUSED: "slate" } as const;

export default async function AdminAttendancePage({ searchParams }: { searchParams: { days?: string } }) {
  await requireRole("admin");
  const days = RANGES.includes(Number(searchParams.days)) ? Number(searchParams.days) : 14;
  const since = new Date(Date.now() - days * 86_400_000);
  await finaliseEndedSessions({ endsAt: { gte: since } });

  const sessions = await prisma.sessionInstance.findMany({
    where: { startsAt: { gte: since, lt: new Date() }, status: { in: ["HELD", "MISSED", "SCHEDULED"] } },
    include: {
      attendances: true,
      progressNote: { select: { id: true } },
      enrollment: { include: { subject: true, student: { include: { user: true } }, teacher: { include: { user: true } } } },
    },
    orderBy: { startsAt: "desc" },
  });

  const studentAtt = (s: (typeof sessions)[number]) => s.attendances.find((a) => a.userId === s.enrollment.studentId)?.status ?? null;
  const teacherAtt = (s: (typeof sessions)[number]) => s.attendances.find((a) => a.userId === s.enrollment.teacherId)?.status ?? null;
  const done = sessions.filter((s) => s.status !== "SCHEDULED");
  const held = done.filter((s) => s.status === "HELD");
  const attended = held.filter((s) => ["PRESENT", "LATE"].includes(studentAtt(s) ?? "")).length;
  const missed = done.filter((s) => s.status === "MISSED");
  const unrecorded = held.filter((s) => !s.progressNote);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Attendance"
        description="Recorded automatically when students and teachers join the online class; corrections are marked as manual."
        actions={
          <div className="flex rounded-lg border border-line bg-white p-0.5">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/admin/attendance?days=${r}`}
                className={clsx("rounded-md px-3 py-1.5 text-xs font-medium", r === days ? "bg-navy-800 text-white" : "text-navy-500 hover:text-navy-800")}
              >
                {r} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Lessons held" value={held.length} hint={`last ${days} days`} icon={CalendarCheck2} />
        <StatCard tone="teal" label="Student attendance" value={held.length ? `${Math.round((attended / held.length) * 100)}%` : "—"} hint={`${attended} of ${held.length} held lessons`} icon={UserCheck} />
        <StatCard tone="rose" label="Missed by teacher" value={missed.length} hint="teacher did not join" icon={AlertTriangle} />
        <StatCard tone="gold" label="Records outstanding" value={unrecorded.length} hint="held, no lesson record" icon={ClipboardX} />
      </div>

      <div className="card">
        {sessions.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={CalendarCheck2} title="No lessons in this period" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-3 font-semibold">Lesson</th>
                  <th className="px-3 py-3 font-semibold">Student</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Teacher</th>
                  <th className="hidden px-3 py-3 font-semibold lg:table-cell">Record</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sessions.map((s) => {
                  const sa = studentAtt(s);
                  const ta = teacherAtt(s);
                  return (
                    <tr key={s.id} className="group hover:bg-ivory">
                      <td className="px-5 py-3">
                        <Link href={`/admin/sessions/${s.id}`} className="block">
                          <span className="block font-medium text-navy-900 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">{s.enrollment.subject.name}</span>
                          <span className="block text-xs tabular-nums text-navy-400">
                            {formatDate(s.startsAt, { weekday: "short", year: undefined })} · {formatTime(s.startsAt)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block text-navy-800">{fullName(s.enrollment.student.user)}</span>
                        {sa ? <Badge tone={TONE[sa]}>{ATTENDANCE_LABEL[sa]}</Badge> : <span className="text-xs text-navy-300">—</span>}
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="block text-navy-800">{fullName(s.enrollment.teacher.user)}</span>
                        {ta ? <Badge tone={TONE[ta]}>{ATTENDANCE_LABEL[ta]}</Badge> : <span className="text-xs text-navy-300">—</span>}
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {s.status === "HELD" ? (
                          s.progressNote ? <Badge tone="green">Recorded</Badge> : <Badge tone="rose">Missing</Badge>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {s.status === "HELD" ? <Badge tone="green">Held</Badge> : s.status === "MISSED" ? <Badge tone="rose">Missed</Badge> : <Badge tone="gold">In progress</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
