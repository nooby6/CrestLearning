import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { curriculumLabel } from "@/lib/roles";
import { weeklyLoadByTeacher } from "@/lib/sessions";
import { PageHeader } from "@/components/ui/primitives";
import { EnrollmentForm } from "./EnrollmentForm";

export const metadata = { title: "New enrollment" };

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

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/enrollments" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Enrollments
      </Link>
      <PageHeader
        eyebrow="Scheduling"
        title="New enrollment"
        description="One student, one subject, one teacher — plus the weekly times they meet. Sessions for the next six weeks are created straight away."
      />
      <EnrollmentForm
        initialStudentId={students.some((s) => s.id === searchParams.student) ? searchParams.student : undefined}
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
