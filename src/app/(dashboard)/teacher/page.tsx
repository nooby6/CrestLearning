import { CalendarClock } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { greeting } from "@/lib/format";
import { Badge, Card, ComingNext, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Today" };

export default async function TeacherHome() {
  const me = await requireRole("teacher");
  const t = await prisma.teacher.findUnique({
    where: { id: me.id },
    include: {
      subjects: { include: { subject: true } },
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title={`${greeting()}, ${me.firstName}`}
        description={`${t?._count.enrollments ?? 0} active students · ${t?.weeklyCapacityHours ?? 0} hrs/week available`}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Today’s sessions" className="lg:col-span-2">
          <EmptyState icon={CalendarClock} title="Nothing scheduled today">
            Your sessions, with join links and attendance, will be listed here.
          </EmptyState>
        </Card>
        <Card title="Subjects you teach">
          {t?.subjects.length ? (
            <div className="flex flex-wrap gap-1.5">
              {t.subjects.map((s) => (
                <Badge key={s.subjectId}>{s.subject.name}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-navy-400">The office hasn’t assigned subjects yet.</p>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ComingNext module="Module 3 · Attendance">Join from here and attendance records itself; correct it in one tap.</ComingNext>
        <ComingNext module="Module 4 · Notes">After each session: topics covered, homework and a short comment for parents.</ComingNext>
      </div>
    </>
  );
}
