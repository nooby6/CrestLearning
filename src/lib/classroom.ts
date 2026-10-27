/**
 * Classroom rules — pure, shared by server and client.
 */

/** Students can enter this many minutes before the start; teachers a little earlier to set up. */
export const STUDENT_EARLY_MIN = 10;
export const TEACHER_EARLY_MIN = 15;
/** The room stays open this long after the scheduled end for overruns. */
export const OVERRUN_MIN = 30;
/** Joining more than this many minutes after the start counts as late. */
export const LATE_AFTER_MIN = 10;
/** Sessions are closed off (held / missed, absences recorded) this long after they end. */
export const FINALISE_AFTER_MIN = 15;
/** Class page sends a heartbeat this often while connected. */
export const HEARTBEAT_SEC = 30;
/** A gap longer than this between heartbeats isn't counted as time present. */
export const MAX_HEARTBEAT_GAP_SEC = 90;

const MIN = 60_000;

export type Participant = "student" | "teacher";

export function joinWindow(s: { startsAt: Date; endsAt: Date }, who: Participant) {
  const early = who === "teacher" ? TEACHER_EARLY_MIN : STUDENT_EARLY_MIN;
  return { opensAt: new Date(+s.startsAt - early * MIN), closesAt: new Date(+s.endsAt + OVERRUN_MIN * MIN) };
}

export type JoinState = "upcoming" | "open" | "closed";

export function joinState(s: { startsAt: Date; endsAt: Date; status: string }, who: Participant, now = Date.now()): JoinState {
  if (s.status !== "SCHEDULED") return "closed";
  const w = joinWindow(s, who);
  if (now < +w.opensAt) return "upcoming";
  if (now > +w.closesAt) return "closed";
  return "open";
}

export const isLate = (startsAt: Date, joinedAt: Date) => +joinedAt - +startsAt > LATE_AFTER_MIN * MIN;

/** "in 3 h 20 min", "in 12 min", "now" */
export function untilLabel(target: Date, now = Date.now()) {
  const mins = Math.ceil((+target - now) / MIN);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) {
    const d = Math.round(h / 24);
    return `in ${d} day${d === 1 ? "" : "s"}`;
  }
  return `in ${h} h${m ? ` ${m} min` : ""}`;
}

export const ATTENDANCE_LABEL = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  EXCUSED: "Excused",
} as const;
