import clsx from "clsx";
import { formatDate } from "@/lib/format";
import { dbDateKey, formatTime } from "@/lib/schedule";
import { ATTENDANCE_LABEL } from "@/lib/classroom";
import type { WeekDigest } from "@/lib/reports";

const TONE: Record<string, string> = {
  PRESENT: "text-emerald-700",
  LATE: "text-amber-700",
  ABSENT: "text-rose-700",
  EXCUSED: "text-navy-500",
};

/** The week's lessons: date, attendance, topics covered and homework. Used by teachers, parents and the office. */
export function WeekSessions({ sessions }: { sessions: WeekDigest["sessions"] }) {
  if (!sessions.length) return <p className="text-sm text-navy-400">No lessons were scheduled this week.</p>;
  return (
    <ol className="space-y-3">
      {sessions.map((s) => {
        const future = +s.startsAt > Date.now();
        return (
          <li key={s.id} className="grid grid-cols-[88px_1fr] gap-3 text-sm">
            <div>
              <p className="font-medium text-navy-800">{formatDate(s.startsAt, { weekday: "short", year: undefined })}</p>
              <p className="text-xs tabular-nums text-navy-400">{formatTime(s.startsAt)}</p>
              <p className={clsx("mt-0.5 text-[11px] font-medium", s.studentAttendance ? TONE[s.studentAttendance] : "text-navy-300")}>
                {s.status === "CANCELLED"
                  ? "Cancelled"
                  : s.studentAttendance
                    ? ATTENDANCE_LABEL[s.studentAttendance]
                    : future
                      ? "Upcoming"
                      : s.status === "MISSED"
                        ? "Not held"
                        : "—"}
              </p>
            </div>
            <div className="min-w-0 border-l border-line pl-3">
              {s.record ? (
                <>
                  <p className="whitespace-pre-line text-navy-800">{s.record.topicsCovered}</p>
                  {s.record.homework && (
                    <p className="mt-1 text-xs text-navy-500">
                      <span className="font-semibold text-navy-700">Homework:</span> {s.record.homework}
                      {s.record.homeworkDue && ` · due ${formatDate(new Date(dbDateKey(s.record.homeworkDue)), { weekday: "short", year: undefined })}`}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-navy-400">
                  {s.status === "CANCELLED"
                    ? s.cancelReason ?? "This lesson was cancelled."
                    : s.status === "MISSED"
                      ? "This lesson did not take place."
                      : future
                        ? "—"
                        : "Lesson record not yet available."}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
