import clsx from "clsx";
import { CalendarDays } from "lucide-react";
import { fullName } from "@/lib/format";
import { formatTimeRange, fromMinutes, toMinutes, weekdayLabel } from "@/lib/schedule";
import type { LessonSummary } from "@/lib/lesson-summary";
import { tintFor } from "@/components/schedule/WeekGrid";
import { StatusBadge } from "@/components/schedule/SessionRow";
import { JoinButton } from "./JoinButton";

/** Today's lessons with times and teachers; lessons left today and this week; the weekly pattern. */
export function LessonOverview({ s, viewer }: { s: LessonSummary; viewer: "student" | "parent" }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Counter value={s.todayLeft} label={s.todayLeft === 1 ? "lesson left today" : "lessons left today"} />
        <Counter value={s.weekLeft} label={`of ${s.weekTotal} ${s.weekTotal === 1 ? "lesson" : "lessons"} left this week`} />
      </div>

      <div>
        <p className="eyebrow mb-2">Today</p>
        {s.today.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-navy-400">No lessons today.</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {s.today.map((x) => (
              <li key={x.id} className={clsx("flex items-center gap-3 px-3 py-2.5", x.status === "CANCELLED" && "opacity-60")}>
                <span className={`h-8 w-1 shrink-0 rounded-full border-l-[3px] ${tintFor(x.enrollment.subject.code)}`} />
                <div className="w-[92px] shrink-0 text-sm font-semibold tabular-nums text-navy-900">{formatTimeRange(x.startsAt, x.endsAt)}</div>
                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-sm font-medium text-navy-900", x.status === "CANCELLED" && "line-through")}>{x.enrollment.subject.name}</p>
                  <p className="truncate text-xs text-navy-400">with {fullName(x.enrollment.teacher.user)}</p>
                </div>
                {viewer === "student" && x.status === "SCHEDULED" ? (
                  <JoinButton sessionId={x.id} startsAt={x.startsAt.toISOString()} endsAt={x.endsAt.toISOString()} status={x.status} who="student" size="sm" />
                ) : null}
                {(viewer === "parent" || x.status !== "SCHEDULED") && <StatusBadge status={x.status} startsAt={x.startsAt} endsAt={x.endsAt} />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="eyebrow mb-2 flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> Weekly lessons
        </p>
        {s.weekly.length === 0 ? (
          <p className="text-sm text-navy-400">No weekly lessons have been scheduled yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {s.weekly.map((w) => (
              <li key={w.key} className="grid grid-cols-[96px_96px_1fr] items-center gap-2 text-sm">
                <span className="font-medium text-navy-800">{weekdayLabel(w.weekday)}</span>
                <span className="tabular-nums text-navy-500">
                  {w.startTime}–{fromMinutes(toMinutes(w.startTime) + w.durationMinutes)}
                </span>
                <span className="truncate text-navy-800">
                  {w.subject} <span className="text-navy-400">· {fullName(w.teacher)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Counter({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-navy-50/70 px-4 py-3">
      <p className="font-display text-2xl font-semibold tabular-nums text-navy-900">{value}</p>
      <p className="text-xs text-navy-500">{label}</p>
    </div>
  );
}
