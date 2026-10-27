import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VideoOff } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { dbDateKey, formatTimeRange } from "@/lib/schedule";
import { providerOf, sessionLink } from "@/lib/meeting";
import { roomConfig } from "@/lib/video";
import { Wordmark } from "@/components/brand/Logo";
import { ClassRoom } from "@/components/class/ClassRoom";
import { MeetCompanion } from "@/components/class/MeetCompanion";

export const metadata = { title: "Lesson" };
export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: { id: string } }) {
  const me = await requireRole("teacher", "student");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const s = await prisma.sessionInstance.findUnique({
    where: { id },
    include: {
      progressNote: true,
      attendances: true,
      rescheduledTo: true,
      enrollment: { include: { subject: true, teacher: { include: { user: true } }, student: { include: { user: true } } } },
    },
  });
  if (!s) notFound();
  const who = s.enrollment.teacherId === me.id ? "teacher" : s.enrollment.studentId === me.id ? "student" : null;
  if (!who) notFound();
  if (s.status === "RESCHEDULED" && s.rescheduledTo) redirect(`/class/${s.rescheduledTo.id}`);

  const e = s.enrollment;
  const other = who === "teacher" ? e.student.user : e.teacher.user;
  const portalHref = who === "teacher" ? "/teacher" : "/student";
  const record = s.progressNote
    ? {
        topicsCovered: s.progressNote.topicsCovered,
        homework: s.progressNote.homework,
        homeworkDue: s.progressNote.homeworkDue ? dbDateKey(s.progressNote.homeworkDue) : null,
      }
    : null;
  const common = {
    sessionId: s.id,
    who,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    status: s.status,
    title: `${e.subject.name} with ${fullName(other)}`,
    timeLabel: formatTimeRange(s.startsAt, s.endsAt),
    portalHref,
    record,
  } as const;

  // 1. Google Meet (or Zoom/Teams) link on the enrollment — the normal case. The URL never reaches the browser here.
  const link = sessionLink(s);
  if (link) {
    return (
      <MeetCompanion
        {...common}
        provider={providerOf(link)!}
        studentName={e.student.user.firstName}
        studentAttendance={s.attendances.find((a) => a.userId === e.studentId)?.status ?? null}
      />
    );
  }

  // 2. Embedded classroom, only if a JaaS / self-hosted Jitsi server is configured.
  const room = roomConfig(s.meetingRoom, { id: me.id, name: fullName(me), email: me.email, avatar: me.avatarUrl }, who === "teacher");
  if (room) return <ClassRoom {...common} room={room} user={{ name: fullName(me), email: me.email }} />;

  // 3. Nothing configured yet.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 text-center">
      <Wordmark className="mb-10" />
      <div className="card max-w-md p-8">
        <VideoOff className="mx-auto h-8 w-8 text-gold-500" />
        <h1 className="mt-3 font-display text-lg font-semibold text-navy-900">The lesson link hasn’t been set up yet</h1>
        <p className="mt-2 text-sm text-navy-500">
          The Crest Learning office adds the Google Meet link for {e.subject.name}. Please contact the office so the lesson can go ahead.
        </p>
        <Link href={portalHref} className="btn-primary mt-6">
          Back to portal
        </Link>
      </div>
    </div>
  );
}
