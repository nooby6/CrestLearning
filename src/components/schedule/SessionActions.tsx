"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CalendarClock, Loader2, MoreHorizontal, X } from "lucide-react";
import { cancelSession, rescheduleSession } from "@/lib/actions/schedule";

/** Move or cancel one upcoming session. Opens an inline panel under the row. */
export function SessionActions({
  sessionId,
  defaultDate,
  defaultTime,
  durationMinutes,
}: {
  sessionId: number;
  defaultDate: string;
  defaultTime: string;
  durationMinutes: number;
}) {
  const [open, setOpen] = useState<null | "menu" | "move" | "cancel">(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        setOpen(null);
      } else toast.error(r.error);
    });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(open ? null : "menu")}
        className="rounded-md p-1.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
        aria-label="Session options"
        aria-expanded={!!open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-72 rounded-xl border border-line bg-white p-3 shadow-lift">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-navy-900">
              {open === "move" ? "Move this session" : open === "cancel" ? "Cancel this session" : "Session"}
            </p>
            <button type="button" onClick={() => setOpen(null)} className="rounded p-0.5 text-navy-300 hover:text-navy-700" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {open === "menu" && (
            <div className="grid gap-1">
              <button type="button" className="rounded-md px-2 py-2 text-left text-sm text-navy-800 hover:bg-navy-50" onClick={() => setOpen("move")}>
                <CalendarClock className="mr-2 inline h-4 w-4 text-gold-500" /> Move to another time
              </button>
              <button type="button" className="rounded-md px-2 py-2 text-left text-sm text-rose-700 hover:bg-rose-50" onClick={() => setOpen("cancel")}>
                <X className="mr-2 inline h-4 w-4" /> Cancel session
              </button>
            </div>
          )}

          {open === "move" && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_96px] gap-2">
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
                <input type="time" step={900} className="input tabular-nums" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
              </div>
              <p className="text-[11px] text-navy-400">Same length ({durationMinutes} min). Only this week changes; the weekly time stays.</p>
              <button
                type="button"
                className="btn-primary w-full"
                disabled={pending}
                onClick={() => run(() => rescheduleSession(sessionId, { date, startTime: time, durationMinutes }))}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move session"}
              </button>
            </div>
          )}

          {open === "cancel" && (
            <div className="space-y-2">
              <input className="input" placeholder="Reason (optional), e.g. public holiday" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button type="button" className="btn-danger w-full" disabled={pending} onClick={() => run(() => cancelSession(sessionId, reason))}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel session"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
