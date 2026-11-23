import { BookOpen } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { tintFor } from "@/components/schedule/WeekGrid";
import { NewSubjectForm, SubjectRow } from "./SubjectControls";

export const metadata = { title: "Subjects" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  await requireRole("admin");
  const [subjects, teachers, taking] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        teachers: { select: { teacherId: true } },
        _count: { select: { enrollments: true, resources: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { user: { active: true } },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
    }),
    prisma.enrollment.groupBy({
      by: ["subjectId", "teacherId"],
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      _count: { _all: true },
    }),
  ]);

  const teacherOptions = teachers.map((t) => ({ id: t.id, name: fullName(t.user) }));
  const totalTeaching = subjects.filter((s) => s.teachers.length).length;

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Subjects"
        description={`${subjects.length} subjects · ${totalTeaching} with at least one teacher. Students can only be enrolled in a subject someone teaches.`}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="All subjects" bodyClassName="p-0">
          {subjects.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={BookOpen} title="No subjects yet">
                Add the first subject on the right.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {subjects.map((s) => {
                const rows = taking.filter((x) => x.subjectId === s.id);
                const students = rows.reduce((a, x) => a + x._count._all, 0);
                return (
                  <SubjectRow
                    key={s.id}
                    tint={tintFor(s.code)}
                    subject={{ id: s.id, name: s.name, code: s.code }}
                    teacherIds={s.teachers.map((t) => t.teacherId)}
                    teachers={teacherOptions}
                    students={students}
                    busy={Object.fromEntries(rows.map((x) => [x.teacherId, x._count._all]))}
                    removable={!s._count.enrollments && !s._count.resources}
                  />
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="Add a subject" description="For example a new STEM class. Choose who teaches it now or later.">
          <NewSubjectForm teachers={teacherOptions} />
        </Card>
      </div>
    </>
  );
}
