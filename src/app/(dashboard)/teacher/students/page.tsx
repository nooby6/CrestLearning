import { Phone, Users } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, prettyPhone } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { formatSlot, formatTime, weekdayIso } from "@/lib/schedule";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "My students" };

export default async function TeacherStudents() {
  const me = await requireRole("teacher");
  const now = new Date();
  const enrollments = await prisma.enrollment.findMany({
    where: { teacherId: me.id, status: { in: ["ACTIVE", "PAUSED"] } },
    include: {
      subject: true,
      level: true,
      slots: { where: { active: true } },
      sessions: { where: { status: "SCHEDULED", startsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 1 },
      student: {
        include: {
          user: true,
          level: true,
          guardians: { where: { isPrimary: true }, include: { parent: { include: { user: true } } } },
        },
      },
    },
    orderBy: [{ student: { user: { firstName: "asc" } } }, { subject: { name: "asc" } }],
  });

  // One card per student, listing every subject they take with me.
  const byStudent = new Map<string, typeof enrollments>();
  for (const e of enrollments) byStudent.set(e.studentId, [...(byStudent.get(e.studentId) ?? []), e]);

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title="My students"
        description={`${byStudent.size} ${byStudent.size === 1 ? "student" : "students"} · ${enrollments.length} subjects`}
      />
      {byStudent.size === 0 ? (
        <EmptyState icon={Users} title="No students yet">
          The Crest office will pair you with students. They’ll appear here with their weekly times.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...byStudent.values()].map((list) => {
            const s = list[0].student;
            const guardian = s.guardians[0]?.parent.user;
            return (
              <article key={s.id} className="card overflow-hidden">
                <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                  <Avatar person={s.user} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-navy-900">{fullName(s.user)}</p>
                    <p className="truncate text-xs text-navy-400">
                      {[curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || "Level not set"}
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-line">
                  {list.map((e) => (
                    <li key={e.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-navy-900">{e.subject.name}</p>
                        {e.status === "PAUSED" ? (
                          <Badge tone="amber">Paused</Badge>
                        ) : e.sessions[0] ? (
                          <span className="text-xs tabular-nums text-navy-500">
                            Next {formatDate(e.sessions[0].startsAt, { weekday: "short", year: undefined })} {formatTime(e.sessions[0].startsAt)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {[...e.slots]
                          .sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday))
                          .map((sl) => (
                            <Badge key={sl.id} tone="slate">
                              {formatSlot(sl)}
                            </Badge>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
                {guardian && (
                  <footer className="flex items-center justify-between border-t border-line bg-ivory/60 px-5 py-2.5 text-xs text-navy-500">
                    <span>Parent: {fullName(guardian)}</span>
                    {guardian.phone && (
                      <a href={`tel:${guardian.phone}`} className="flex items-center gap-1 tabular-nums hover:text-navy-800">
                        <Phone className="h-3.5 w-3.5 text-gold-500" /> {prettyPhone(guardian.phone)}
                      </a>
                    )}
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
