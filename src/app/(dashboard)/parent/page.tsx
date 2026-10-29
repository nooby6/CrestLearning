import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, FileText, UsersRound } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { curriculumLabel, relationshipLabel } from "@/lib/roles";
import { dbDateKey } from "@/lib/schedule";
import { lessonSummary } from "@/lib/lesson-summary";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { workForParent } from "@/lib/work-queries";
import { LessonOverview } from "@/components/class/LessonOverview";

export const metadata = { title: "Overview" };

export default async function ParentHome() {
  const me = await requireRole("parent");

  // Scoped strictly through the link table — a parent only ever sees their own students.
  const links = await prisma.parentStudent.findMany({
    where: { parentId: me.id, student: { user: { active: true } } },
    include: { student: { include: { user: true, level: true } } },
    orderBy: { createdAt: "asc" },
  });
  const ids = links.map((l) => l.studentId);
  const [summaries, latestReports] = await Promise.all([
    lessonSummary(ids),
    prisma.weeklyReport.groupBy({
      by: ["enrollmentId"],
      where: { enrollment: { studentId: { in: ids } } },
      _max: { weekStart: true },
    }),
  ]);
  const enrollmentStudents = latestReports.length
    ? await prisma.enrollment.findMany({ where: { id: { in: latestReports.map((r) => r.enrollmentId) } }, select: { id: true, studentId: true } })
    : [];
  const work = new Map((await workForParent(me.id)).map((g) => [g.student.id, g.items]));
  const workLine = (studentId: string) => {
    const items = work.get(studentId) ?? [];
    const todo = items.filter((i) => i.state === "todo" || i.state === "overdue").length;
    const overdue = items.filter((i) => i.state === "overdue").length;
    const marked = items.filter((i) => i.state === "reviewed").length;
    if (!items.length) return "Schoolwork";
    return [todo ? `${todo} to do` : "Nothing to do", overdue ? `${overdue} overdue` : null, marked ? `${marked} marked` : null].filter(Boolean).join(" · ");
  };
  const latestFor = (studentId: string) =>
    latestReports
      .filter((r) => enrollmentStudents.find((e) => e.id === r.enrollmentId)?.studentId === studentId)
      .map((r) => r._max.weekStart!)
      .sort((a, b) => +b - +a)[0];

  return (
    <>
      <PageHeader
        eyebrow="Parent portal"
        title={`${greeting()}, ${me.firstName}`}
        description={
          links.length
            ? `${links.length} ${links.length === 1 ? "student is" : "students are"} linked to your account.`
            : undefined
        }
        actions={
          links.length ? (
            <Link href="/parent/reports" className="btn-primary">
              <FileText className="h-4 w-4" /> Weekly reports
            </Link>
          ) : undefined
        }
      />

      {links.length === 0 ? (
        <EmptyState icon={UsersRound} title="No students linked yet">
          The Crest office links your account to your students. Lessons, attendance and weekly reports will appear here once they do.
        </EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {links.map(({ student: s, isPrimary, relationship }) => {
            const latest = latestFor(s.id);
            return (
              <article key={s.id} className="card flex flex-col overflow-hidden">
                <header className="flex items-center gap-4 border-b border-line bg-ivory/60 px-5 py-4">
                  <Avatar person={s.user} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold text-navy-900">{fullName(s.user)}</h2>
                    <p className="text-sm text-navy-500">
                      {[curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || "Level to be confirmed"}
                    </p>
                  </div>
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    {isPrimary && <Badge tone="gold">Primary contact</Badge>}
                    <span className="text-[11px] text-navy-400">{relationshipLabel(relationship)}</span>
                  </div>
                </header>
                <div className="flex-1 px-5 py-5">
                  <LessonOverview s={summaries[s.id]} viewer="parent" />
                </div>
                <footer className="grid grid-cols-2 divide-x divide-line border-t border-line text-sm">
                  <Link href={`/parent/reports?student=${s.id}${latest ? `&week=${dbDateKey(latest)}` : ""}`} className="flex items-center justify-between gap-2 px-5 py-3 text-navy-700 hover:bg-ivory">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gold-500" />
                      {latest ? `Report · week of ${formatDate(latest, { year: undefined })}` : "Weekly reports"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-navy-300" />
                  </Link>
                  <Link href={`/parent/timetable?student=${s.id}`} className="flex items-center justify-between gap-2 px-5 py-3 text-navy-700 hover:bg-ivory">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-gold-500" /> Timetable
                    </span>
                    <ArrowRight className="h-4 w-4 text-navy-300" />
                  </Link>
                  <Link
                    href="/parent/work"
                    className="col-span-2 flex items-center justify-between gap-2 !border-l-0 border-t border-line px-5 py-3 text-navy-700 hover:bg-ivory"
                  >
                    <span className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gold-500" /> Worksheets · {workLine(s.id)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-navy-300" />
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
      )}

    </>
  );
}
