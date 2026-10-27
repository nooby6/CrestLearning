import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import type { CurrentUser } from "@/lib/auth";
import { finaliseEndedSessions } from "@/lib/attendance";
import { formatDate, fullName } from "@/lib/format";
import { dateKey, dbDateKey, formatTime, formatTimeRange } from "@/lib/schedule";
import { Card, DefinitionList } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/schedule/SessionRow";
import { SessionActions } from "@/components/schedule/SessionActions";
import { AttendanceEditor, type AttendanceRow } from "./AttendanceEditor";
import { JoinButton } from "./JoinButton";
import { LessonRecordForm } from "./LessonRecordForm";

const mins = (sec: number) => (sec < 60 ? "under a minute" : `${Math.round(sec / 60)} min`);

/** One session: attendance (with corrections), the lesson record, and move/cancel. */
export async function SessionDetail({ id, me, backHref, backLabel }: { id: number; me: CurrentUser; backHref: string; backLabel: string }) {
  await finaliseEndedSessions({ id });
  const s = await prisma.sessionInstance.findUnique({
    where: { id },
    include: {
      progressNote: { include: { author: true } },
      attendances: true,
      rescheduledFrom: true,
      rescheduledTo: true,
      enrollment: { include: { subject: true, level: true, teacher: { include: { user: true } }, student: { include: { user: true } } } },
    },
  });
  if (!s) notFound();
  const isTeacher = me.role === "TEACHER";
  if (isTeacher && s.enrollment.teacherId !== me.id) notFound();

  const e = s.enrollment;
  const started = +s.startsAt <= Date.now();
  const takesPlace = s.status !== "CANCELLED" && s.status !== "RESCHEDULED";

  const row = (user: typeof e.student.user, roleLabel: string, editable: boolean): AttendanceRow => {
    const a = s.attendances.find((x) => x.userId === user.id);
    const detail = a?.firstJoinedAt
      ? `Joined ${formatTime(a.firstJoinedAt)}${a.secondsPresent ? ` · in class ${mins(a.secondsPresent)}` : ""}`
      : started
        ? "Did not join online"
        : "Session hasn’t started";
    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      roleLabel,
      status: a?.status ?? null,
      source: a?.source ?? null,
      detail,
      reason: a?.overrideReason ?? null,
      editable,
    };
  };

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </Link>

      <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="eyebrow">{formatDate(s.startsAt, { weekday: "long", month: "long" })}</p>
          <h1 className="mt-1 font-display text-xl font-semibold text-navy-900">
            {e.subject.name} · {formatTimeRange(s.startsAt, s.endsAt)}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {fullName(e.student.user)} with {fullName(e.teacher.user)}
            {e.level ? ` · ${e.level.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={s.status} startsAt={s.startsAt} endsAt={s.endsAt} />
          {isTeacher && (
            <JoinButton sessionId={s.id} startsAt={s.startsAt.toISOString()} endsAt={s.endsAt.toISOString()} status={s.status} who="teacher" />
          )}
          {s.status === "SCHEDULED" && !started && (
            <SessionActions
              sessionId={s.id}
              defaultDate={dateKey(s.startsAt)}
              defaultTime={formatTime(s.startsAt)}
              durationMinutes={(+s.endsAt - +s.startsAt) / 60000}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {takesPlace && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-gold-500" /> Lesson record
                  {!s.progressNote && started && <span className="text-xs font-normal text-rose-600">· required</span>}
                </span>
              }
              description="What was covered and any homework set. Parents see this in the weekly report."
            >
              {!started ? (
                <p className="text-sm text-navy-400">You can complete the record once the lesson has started.</p>
              ) : isTeacher || me.role === "ADMIN" ? (
                <>
                  <LessonRecordForm
                    sessionId={s.id}
                    existing={
                      s.progressNote
                        ? {
                            topicsCovered: s.progressNote.topicsCovered,
                            homework: s.progressNote.homework,
                            homeworkDue: s.progressNote.homeworkDue ? dbDateKey(s.progressNote.homeworkDue) : null,
                          }
                        : null
                    }
                  />
                  {s.progressNote && (
                    <p className="mt-3 text-[11px] text-navy-400">
                      Recorded by {fullName(s.progressNote.author)} · {formatDate(s.progressNote.updatedAt, { year: undefined })} {formatTime(s.progressNote.updatedAt)}
                    </p>
                  )}
                </>
              ) : null}
            </Card>
          )}

          {takesPlace && (
            <Card title="Attendance" description="Captured automatically from the online class. Correct it if something went wrong." bodyClassName="px-5 py-1">
              <AttendanceEditor
                sessionId={s.id}
                canEdit={started}
                rows={[row(e.student.user, "Student", true), row(e.teacher.user, "Teacher", me.role === "ADMIN")]}
              />
            </Card>
          )}

          {!takesPlace && (
            <Card title={s.status === "CANCELLED" ? "Cancelled" : "Moved"}>
              <p className="text-sm text-navy-600">
                {s.status === "CANCELLED"
                  ? s.cancelReason ?? "This session was cancelled."
                  : s.rescheduledTo
                    ? `Moved to ${formatDate(s.rescheduledTo.startsAt, { weekday: "long", year: undefined })} at ${formatTime(s.rescheduledTo.startsAt)}.`
                    : "This session was moved."}
              </p>
            </Card>
          )}
        </div>

        <Card title="Details">
          <DefinitionList
            items={[
              { label: "Student", value: fullName(e.student.user) },
              { label: "Teacher", value: fullName(e.teacher.user) },
              { label: "Subject", value: e.subject.name },
              { label: "Level", value: e.level?.name ?? "—" },
              ...(s.rescheduledFrom
                ? [{ label: "Originally", value: `${formatDate(s.rescheduledFrom.startsAt, { weekday: "short", year: undefined })} ${formatTime(s.rescheduledFrom.startsAt)}` }]
                : []),
            ]}
          />
        </Card>
      </div>
    </>
  );
}
