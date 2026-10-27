import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { formatTimeRange } from "@/lib/schedule";
import { roomConfig } from "@/lib/video";
import { dbDateKey } from "@/lib/schedule";
import { ClassRoom } from "@/components/class/ClassRoom";

export const metadata = { title: "Online class" };
export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: { id: string } }) {
  const me = await requireRole("teacher", "student");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const s = await prisma.sessionInstance.findUnique({
    where: { id },
    include: {
      progressNote: true,
      rescheduledTo: true,
      enrollment: { include: { subject: true, teacher: { include: { user: true } }, student: { include: { user: true } } } },
    },
  });
  if (!s) notFound();
  const who = s.enrollment.teacherId === me.id ? "teacher" : s.enrollment.studentId === me.id ? "student" : null;
  if (!who) notFound();
  // A moved session sends people to its replacement.
  if (s.status === "RESCHEDULED" && s.rescheduledTo) redirect(`/class/${s.rescheduledTo.id}`);

  const e = s.enrollment;
  const other = who === "teacher" ? e.student.user : e.teacher.user;

  return (
    <ClassRoom
      sessionId={s.id}
      who={who}
      startsAt={s.startsAt.toISOString()}
      endsAt={s.endsAt.toISOString()}
      status={s.status}
      title={`${e.subject.name} with ${fullName(other)}`}
      timeLabel={formatTimeRange(s.startsAt, s.endsAt)}
      portalHref={who === "teacher" ? "/teacher" : "/student"}
      room={roomConfig(s.meetingRoom, { id: me.id, name: fullName(me), email: me.email, avatar: me.avatarUrl }, who === "teacher")}
      user={{ name: fullName(me), email: me.email }}
      record={
        s.progressNote
          ? {
              topicsCovered: s.progressNote.topicsCovered,
              homework: s.progressNote.homework,
              homeworkDue: s.progressNote.homeworkDue ? dbDateKey(s.progressNote.homeworkDue) : null,
            }
          : null
      }
    />
  );
}
