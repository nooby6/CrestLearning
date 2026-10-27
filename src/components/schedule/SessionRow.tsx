import clsx from "clsx";
import { Badge } from "@/components/ui/primitives";
import { formatTimeRange } from "@/lib/schedule";
import { tintFor } from "./WeekGrid";

const STATUS: Record<string, { label: string; tone: "navy" | "green" | "rose" | "slate" | "amber" }> = {
  SCHEDULED: { label: "Scheduled", tone: "navy" },
  HELD: { label: "Held", tone: "green" },
  MISSED: { label: "Missed", tone: "rose" },
  RESCHEDULED: { label: "Moved", tone: "slate" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

export function StatusBadge({ status, startsAt, endsAt }: { status: string; startsAt: Date; endsAt: Date }) {
  const now = Date.now();
  if (status === "SCHEDULED" && +startsAt <= now && +endsAt >= now) return <Badge tone="gold">In progress</Badge>;
  if (status === "SCHEDULED" && +endsAt < now) return <Badge tone="amber">Awaiting attendance</Badge>;
  const s = STATUS[status] ?? STATUS.SCHEDULED;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Compact session line: colour bar · time · title/subtitle · status/action. */
export function SessionRow({
  startsAt,
  endsAt,
  title,
  subtitle,
  colorKey,
  status,
  dateLabel,
  action,
}: {
  startsAt: Date;
  endsAt: Date;
  title: string;
  subtitle?: string;
  colorKey: string;
  status: string;
  dateLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={clsx("flex items-center gap-4 py-3", status === "CANCELLED" && "opacity-60")}>
      <span className={clsx("h-10 w-1 shrink-0 rounded-full border-l-[3px]", tintFor(colorKey))} />
      <div className="w-24 shrink-0">
        {dateLabel && <p className="text-[11px] font-medium text-navy-400">{dateLabel}</p>}
        <p className="text-sm font-semibold tabular-nums text-navy-900">{formatTimeRange(startsAt, endsAt)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("truncate text-sm font-medium text-navy-900", status === "CANCELLED" && "line-through")}>{title}</p>
        {subtitle && <p className="truncate text-xs text-navy-400">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={status} startsAt={startsAt} endsAt={endsAt} />
        {action}
      </div>
    </div>
  );
}
