import Link from "next/link";
import { FileText } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { addDaysKey, dateKey } from "@/lib/schedule";
import { weekDigest } from "@/lib/reports";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";
import { StudentWeekReport } from "@/components/reports/StudentWeekReport";

export const metadata = { title: "Weekly reports" };

export default async function AdminReportsPage({ searchParams }: { searchParams: { week?: string; student?: string } }) {
  await requireRole("admin");
  const weekKey = resolveWeek(searchParams.week);
  const overdue = dateKey(new Date()) > addDaysKey(weekKey, 6);

  if (searchParams.student) {
    const st = await prisma.student.findUnique({ where: { id: searchParams.student }, include: { user: true, level: true } });
    if (st) {
      const items = await weekDigest({ studentId: st.id }, weekKey);
      return (
        <>
          <PageHeader eyebrow="Weekly reports" title={`${fullName(st.user)} — parent view`} description="Exactly what the student’s parents see for this week." />
          <div className="card mb-6 flex items-center justify-between px-4 py-3">
            <WeekNav weekKey={weekKey} basePath="/admin/reports" params={{ student: st.id }} />
            <Link href={`/admin/reports?week=${weekKey}`} className="text-xs font-medium text-navy-500 hover:text-navy-800">
              All reports →
            </Link>
          </div>
          <StudentWeekReport
            student={{ id: st.id, firstName: st.user.firstName, lastName: st.user.lastName, avatarUrl: st.user.avatarUrl, curriculum: st.curriculum, levelName: st.level?.name }}
            items={items}
          />
        </>
      );
    }
  }

  const digest = await weekDigest({}, weekKey);
  const done = digest.filter((d) => d.report).length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Weekly reports"
        description="Teachers submit one report per student and subject each week. Open a student to see their parents’ view."
      />
      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <WeekNav weekKey={weekKey} basePath="/admin/reports" />
          <p className="text-sm text-navy-600">
            <span className="font-semibold tabular-nums text-navy-900">
              {done} of {digest.length}
            </span>{" "}
            submitted
          </p>
        </div>
        {digest.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={FileText} title="No subjects running this week" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Subject</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Teacher</th>
                  <th className="hidden px-3 py-3 font-semibold sm:table-cell">Lessons</th>
                  <th className="px-5 py-3 text-right font-semibold">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {digest.map((d) => {
                  const e = d.enrollment;
                  const recorded = d.sessions.filter((s) => s.record).length;
                  return (
                    <tr key={e.id} className="hover:bg-ivory">
                      <td className="px-5 py-3">
                        <Link href={`/admin/reports?week=${weekKey}&student=${e.studentId}`} className="flex items-center gap-3 font-medium text-navy-900 hover:underline hover:decoration-gold-400 hover:underline-offset-4">
                          <Avatar person={e.student.user} size="sm" />
                          {fullName(e.student.user)}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-navy-700">{e.subject.name}</td>
                      <td className="hidden px-3 py-3 text-navy-600 md:table-cell">{fullName(e.teacher.user)}</td>
                      <td className="hidden px-3 py-3 tabular-nums text-navy-600 sm:table-cell">
                        {d.held} held · {recorded} recorded
                      </td>
                      <td className="px-5 py-3 text-right">
                        {d.report ? <Badge tone="green">Submitted</Badge> : <Badge tone={overdue ? "rose" : "amber"}>{overdue ? "Overdue" : "Pending"}</Badge>}
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
