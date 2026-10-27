import { Video } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName, greeting } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { Card, ComingNext, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Home" };

export default async function StudentHome() {
  const me = await requireRole("student");
  const s = await prisma.student.findUnique({
    where: { id: me.id },
    include: {
      level: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: { subject: true, teacher: { include: { user: true } } },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={[curriculumLabel(s?.curriculum), s?.level?.name].filter((x) => x && x !== "—").join(" · ") || "Student portal"}
        title={`${greeting()}, ${me.firstName}`}
        description="Your classes, resources and homework live here."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Next class" className="lg:col-span-2">
          <EmptyState icon={Video} title="No classes scheduled yet">
            When your timetable is set, a “Join class” button will appear here a few minutes before each lesson.
          </EmptyState>
        </Card>
        <Card title="My subjects">
          {s?.enrollments.length ? (
            <ul className="space-y-2 text-sm">
              {s.enrollments.map((e) => (
                <li key={e.id} className="flex justify-between">
                  <span className="font-medium">{e.subject.name}</span>
                  <span className="text-navy-500">{fullName(e.teacher.user)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-navy-400">Your subjects will show here once you’re enrolled.</p>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ComingNext module="Module 2 · Timetable">Your week at a glance, in Nairobi time.</ComingNext>
        <ComingNext module="Module 4 · Resources & homework">Notes and files from your teachers, only for your subjects and level.</ComingNext>
      </div>
    </>
  );
}
