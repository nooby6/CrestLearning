import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WEEKDAYS, addDaysKey, dateKey, formatTimeRange, mondayOf, partsInZone } from "@/lib/schedule";

export type GridSession = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  title: string; // e.g. "Mathematics"
  subtitle?: string; // e.g. "Amani M. · Achieng O."
  status: "SCHEDULED" | "HELD" | "MISSED" | "RESCHEDULED" | "CANCELLED";
  colorKey: string; // subject code → stable colour
  href?: string;
};

const PALETTE = [
  "bg-navy-50 border-navy-700 text-navy-900",
  "bg-gold-50 border-gold-500 text-gold-900",
  "bg-emerald-50 border-emerald-600 text-emerald-900",
  "bg-sky-50 border-sky-600 text-sky-900",
  "bg-rose-50 border-rose-500 text-rose-900",
  "bg-violet-50 border-violet-500 text-violet-900",
  "bg-amber-50 border-amber-500 text-amber-900",
];
export const tintFor = (key: string) => PALETTE[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];

const HOUR_PX = 56;

/** Lane assignment so overlapping sessions sit side by side. */
function layout(items: GridSession[]) {
  const sorted = [...items].sort((a, b) => +a.startsAt - +b.startsAt);
  const lanes: number[] = [];
  const placed = sorted.map((s) => {
    let lane = lanes.findIndex((end) => end <= +s.startsAt);
    if (lane === -1) lane = lanes.length;
    lanes[lane] = +s.endsAt;
    return { s, lane };
  });
  return placed.map((p) => ({ ...p, lanes: lanes.length }));
}

export function WeekNav({ weekKey, basePath, params = {} }: { weekKey: string; basePath: string; params?: Record<string, string | undefined> }) {
  const href = (k?: string) => {
    const q = new URLSearchParams();
    Object.entries({ ...params, week: k }).forEach(([a, b]) => b && q.set(a, b));
    const s = q.toString();
    return `${basePath}${s ? `?${s}` : ""}`;
  };
  const thisWeek = mondayOf(dateKey(new Date()));
  const end = addDaysKey(weekKey, 6);
  const fmt = (k: string, withMonth: boolean) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: withMonth ? "short" : undefined, timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, d)),
    );
  };
  const sameMonth = weekKey.slice(0, 7) === end.slice(0, 7);
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addDaysKey(weekKey, -7))} className="btn-ghost px-2 py-1.5" aria-label="Previous week">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[132px] text-center text-sm font-medium tabular-nums text-navy-800">
        {fmt(weekKey, !sameMonth)} – {fmt(end, true)}
      </span>
      <Link href={href(addDaysKey(weekKey, 7))} className="btn-ghost px-2 py-1.5" aria-label="Next week">
        <ChevronRight className="h-4 w-4" />
      </Link>
      {weekKey !== thisWeek && (
        <Link href={href(undefined)} className="btn-ghost px-3 py-1.5 text-xs">
          This week
        </Link>
      )}
    </div>
  );
}

export function WeekGrid({ weekKey, sessions }: { weekKey: string; sessions: GridSession[] }) {
  const visible = sessions.filter((s) => s.status !== "RESCHEDULED");
  const days = WEEKDAYS.map((d, i) => ({ ...d, key: addDaysKey(weekKey, i) }));
  const today = dateKey(new Date());
  const now = partsInZone(new Date());

  // Hour range: 07:00–20:00 at minimum, stretched to fit any session.
  let startH = 7;
  let endH = 20;
  for (const s of visible) {
    const a = partsInZone(s.startsAt).minutes;
    const b = partsInZone(s.endsAt).minutes || 24 * 60;
    startH = Math.min(startH, Math.floor(a / 60));
    endH = Math.max(endH, Math.ceil(b / 60));
  }
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  // Hide Sunday unless something is on it.
  const showSunday = visible.some((s) => dateKey(s.startsAt) === days[6].key);
  const cols = showSunday ? days : days.slice(0, 6);

  const byDay = new Map<string, GridSession[]>();
  for (const s of visible) {
    const k = dateKey(s.startsAt);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }

  return (
    <>
      {/* Desktop grid */}
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[760px]">
          <div className="grid border-b border-line" style={{ gridTemplateColumns: `56px repeat(${cols.length}, 1fr)` }}>
            <div />
            {cols.map((d) => {
              const isToday = d.key === today;
              return (
                <div key={d.key} className="px-2 py-3 text-center">
                  <p className={clsx("text-[11px] font-semibold uppercase tracking-wider", isToday ? "text-gold-600" : "text-navy-400")}>
                    {d.short}
                  </p>
                  <p
                    className={clsx(
                    "mx-auto mt-1 flex h-7 w-7 items-center justify-center font-display text-sm font-semibold tabular-nums",
                      isToday ? "bg-navy-800 text-white" : "text-navy-800",
                    )}
                  >
                    {Number(d.key.slice(8))}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${cols.length}, 1fr)` }}>
            <div>
              {hours.map((h) => (
                <div key={h} className="relative pr-2 text-right text-[11px] tabular-nums text-navy-300" style={{ height: HOUR_PX }}>
                  <span className="relative -top-2">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            {cols.map((d) => (
              <div key={d.key} className={clsx("relative border-l border-line", d.key === today && "bg-gold-50/30")}>
                {hours.map((h) => (
                  <div key={h} className="border-b border-dashed border-line/70" style={{ height: HOUR_PX }} />
                ))}
                {d.key === today && now.minutes >= startH * 60 && now.minutes <= endH * 60 && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((now.minutes - startH * 60) / 60) * HOUR_PX }}>
                    <span className="-ml-1 h-2 w-2 bg-gold-500" />
                    <span className="h-px flex-1 bg-gold-500" />
                  </div>
                )}
                {layout(byDay.get(d.key) ?? []).map(({ s, lane, lanes }) => {
                  const a = partsInZone(s.startsAt).minutes - startH * 60;
                  const len = (+s.endsAt - +s.startsAt) / 60000;
                  const cancelled = s.status === "CANCELLED";
                  const Body = (
                    <div
                      className={clsx(
                        "absolute overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-[11px] leading-tight transition hover:z-20 hover:shadow-lift",
                        tintFor(s.colorKey),
                        cancelled && "opacity-50 [&_p:first-child]:line-through",
                      )}
                      style={{
                        top: (a / 60) * HOUR_PX + 1,
                        height: Math.max((len / 60) * HOUR_PX - 2, 22),
                        left: `calc(${(lane / lanes) * 100}% + 2px)`,
                        width: `calc(${100 / lanes}% - 4px)`,
                      }}
                      title={`${s.title} · ${formatTimeRange(s.startsAt, s.endsAt)}${s.subtitle ? ` · ${s.subtitle}` : ""}${cancelled ? " · cancelled" : ""}`}
                    >
                      <p className="truncate font-semibold">{s.title}</p>
                      {len >= 40 && <p className="truncate opacity-80">{formatTimeRange(s.startsAt, s.endsAt)}</p>}
                      {len >= 55 && s.subtitle && <p className="truncate opacity-70">{s.subtitle}</p>}
                    </div>
                  );
                  return s.href ? (
                    <Link key={s.id} href={s.href}>
                      {Body}
                    </Link>
                  ) : (
                    <div key={s.id}>{Body}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile agenda */}
      <ol className="space-y-4 md:hidden">
        {days.map((d) => {
          const list = (byDay.get(d.key) ?? []).sort((a, b) => +a.startsAt - +b.startsAt);
          if (!list.length && d.iso === 7) return null;
          return (
            <li key={d.key}>
              <p className={clsx("mb-2 text-xs font-semibold", d.key === today ? "text-gold-600" : "text-navy-400")}>
                {d.label} {Number(d.key.slice(8))}
                {d.key === today && " · Today"}
              </p>
              {list.length === 0 ? (
                <p className="text-xs text-navy-300">No sessions</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((s) => (
                    <li key={s.id} className={clsx("rounded-lg border-l-[3px] px-3 py-2 text-sm", tintFor(s.colorKey), s.status === "CANCELLED" && "opacity-50")}>
                      <p className="font-semibold">
                        {s.title} {s.status === "CANCELLED" && <span className="text-xs font-normal">(cancelled)</span>}
                      </p>
                      <p className="text-xs opacity-80">
                        {formatTimeRange(s.startsAt, s.endsAt)}
                        {s.subtitle ? ` · ${s.subtitle}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** Parse ?week=YYYY-MM-DD into its Monday; default this week. */
export function resolveWeek(param?: string) {
  const k = param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : dateKey(new Date());
  return mondayOf(k);
}
