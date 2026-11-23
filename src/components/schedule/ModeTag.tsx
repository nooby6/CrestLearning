import clsx from "clsx";
import { MapPin, Video } from "lucide-react";

export type LessonMode = "ONLINE" | "IN_PERSON";

/** The room of an in-person lesson. Online lessons may keep a link in `location`, which is never a room. */
export const roomOf = (s: { mode: string; location: string | null }) => (s.mode === "IN_PERSON" ? s.location : null);

export const modeLabel = (mode: string, room?: string | null) =>
  mode === "IN_PERSON" ? (room ? `In person · ${room}` : "In person") : "Online";

/**
 * Where a lesson happens. In person is the gold, filled tag so it stands out on a mostly-online timetable;
 * online is a quiet outline.
 */
export function ModeTag({ mode, room, className, compact }: { mode: string; room?: string | null; className?: string; compact?: boolean }) {
  const inPerson = mode === "IN_PERSON";
  const Icon = inPerson ? MapPin : Video;
  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1 whitespace-nowrap px-1.5 py-0.5 text-[11px] font-semibold leading-none",
        inPerson ? "bg-gold-100 text-gold-800" : "text-navy-500 ring-1 ring-inset ring-navy-100",
        className,
      )}
      title={modeLabel(mode, room)}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{compact ? (inPerson ? "In person" : "Online") : modeLabel(mode, room)}</span>
    </span>
  );
}
