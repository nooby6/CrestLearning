import { CheckCircle2, FileText } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { addDaysKey, dateKey, mondayOf } from "@/lib/schedule";
import { weekDigest } from "@/lib/reports";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";
import { WeekSessions } from "@/components/reports/WeekSessions";
import { WeeklyReportForm } from "@/components/reports/WeeklyReportForm";

export const metadata = { title: "Weekly reports" };

const keyDate = (k: string) => new Date(`${k}T09:00:00Z`);

export default async function TeacherReportsPage({ searchParams }: { searchParams: { week?: string } }) {
  const me = await requireRole("teacher");
  const thisWeek = mondayOf(dateKey(new Date()));
  const weekKey = resolveWeek(searchParams.week);
  const future = weekKey > thisWeek;
  const digest = future ? [] : await weekDigest({ teacherId: me.id }, weekKey);
  const sunday = addDaysKey(weekKey, 6);
  const overdue = dateKey(new Date()) > sunday;
  const done = digest.filter((d) => d.report).length;

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title="Weekly reports"
        description={`One report per student for each subject, due by Sunday. The week's lesson records are included for parents automatically.`}
      />

      <div className="card mb-6 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <WeekNav weekKey={weekKey} basePath="/teacher/reports" />
        {!future && digest.length > 0 && (
          <p className="text-sm text-navy-600">
            <span className="font-semibold tabular-nums text-navy-900">
              {done} of {digest.length}
            </span>{" "}
            submitted · {overdue && done < digest.length ? <span className="font-medium text-rose-600">overdue</span> : `due ${formatDate(keyDate(sunday), { weekday: "long", year: undefined })}`}
          </p>
        )}
      </div>

      {future ? (
        <EmptyState icon={FileText} title="This week hasn’t started yet">
          Reports can be written from the Monday of the week they cover.
        </EmptyState>
      ) : digest.length === 0 ? (
        <EmptyState icon={FileText} title="No students this week">
          Reports appear here for every student you teach.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {digest.map((d) => {
            const e = d.enrollment;
            return (
              <article key={e.id} className="card overflow-hidden">
                <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
                  <Avatar person={e.student.user} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900">
                      {fullName(e.student.user)} · {e.subject.name}
                    </p>
                    <p className="text-xs text-navy-400">
                      {e.level?.name ?? e.student.level?.name ?? "Level not set"} · {d.held} {d.held === 1 ? "lesson" : "lessons"} held
                      {d.countedForAttendance > 0 && ` · attended ${d.attended} of ${d.countedForAttendance}`}
                    </p>
                  </div>
                  {d.report ? (
                    <Badge tone="green">
                      <CheckCircle2 className="h-3 w-3" /> Submitted
                    </Badge>
                  ) : (
                    <Badge tone={overdue ? "rose" : "amber"}>{overdue ? "Overdue" : "To write"}</Badge>
                  )}
                </header>
                <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.15fr]">
                  <section>
                    <p className="eyebrow mb-3">This week’s lessons</p>
                    <WeekSessions sessions={d.sessions} />
                  </section>
                  <section className="lg:border-l lg:border-line lg:pl-6">
                    <p className="eyebrow mb-3">Your report to parents</p>
                    <WeeklyReportForm
                      enrollmentId={e.id}
                      weekStart={weekKey}
                      studentFirstName={e.student.user.firstName}
                      existing={d.report}
                    />
                  </section>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
