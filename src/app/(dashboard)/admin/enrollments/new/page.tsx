import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { curriculumLabel } from "@/lib/roles";
import { weeklyLoadByTeacher } from "@/lib/sessions";
import { PageHeader } from "@/components/ui/primitives";
import { EnrollmentForm } from "./EnrollmentForm";

export const metadata = { title: "Enroll a student" };

export default async function NewEnrollmentPage({ searchParams }: { searchParams: { student?: string } }) {
  await requireRole("admin");
  const [students, teachers, subjects, levels, load] = await Promise.all([
    prisma.student.findMany({
      where: { user: { active: true } },
      include: { user: true, level: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.teacher.findMany({
      where: { user: { active: true } },
      include: { user: true, subjects: true },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.level.findMany({ orderBy: [{ curriculum: "asc" }, { sortOrder: "asc" }], select: { id: true, curriculum: true, name: true } }),
    weeklyLoadByTeacher(),
  ]);

  const preset = students.find((s) => s.id === searchParams.student);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={preset ? `/admin/enrollments/${preset.id}` : "/admin/enrollments"} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> {preset ? `${preset.user.firstName}’s enrollment` : "Enrollments"}
      </Link>
      <PageHeader
        eyebrow="Enrollments"
        title={preset ? `Add a subject for ${preset.user.firstName}` : "Enroll a student"}
        description={
          preset
            ? "Choose the subject, the teacher and the weekly times. Lessons for the next six weeks are scheduled straight away."
            : "Choose the student, then their first subject, teacher and weekly times. Add more subjects from the student’s enrollment page."
        }
      />
      <EnrollmentForm
        initialStudentId={preset?.id}
        subjects={subjects}
        levels={levels}
        students={students.map((s) => ({
          id: s.id,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          avatarUrl: s.user.avatarUrl,
          meta: [curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || undefined,
          curriculum: s.curriculum,
          levelId: s.levelId,
          hasLink: !!s.meetingUrl,
        }))}
        teachers={teachers.map((t) => ({
          id: t.id,
          firstName: t.user.firstName,
          lastName: t.user.lastName,
          avatarUrl: t.user.avatarUrl,
          subjectIds: t.subjects.map((x) => x.subjectId),
          loadMinutes: load.get(t.id) ?? 0,
          capacityHours: t.weeklyCapacityHours,
        }))}
      />
    </div>
  );
}
