"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowLeftRight, CalendarClock, Loader2, MoreHorizontal, X } from "lucide-react";
import { cancelSession, rescheduleSession, swapOptions, swapSession, type SwapOption } from "@/lib/actions/schedule";
import type { Conflict } from "@/lib/sessions";

type Panel = null | "menu" | "move" | "cancel" | "swap";

/** Move, swap or cancel one upcoming lesson. Opens an inline panel under the row. Swapping is for the office only. */
export function SessionActions({
  sessionId,
  defaultDate,
  defaultTime,
  durationMinutes,
  canSwap = false,
}: {
  sessionId: number;
  defaultDate: string;
  defaultTime: string;
  durationMinutes: number;
  canSwap?: boolean;
}) {
  const [open, setOpen] = useState<Panel>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  // Swap state
  const [options, setOptions] = useState<SwapOption[] | null>(null);
  const [current, setCurrent] = useState<{ subject: string; teacher: string } | null>(null);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [teacherId, setTeacherId] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        setOpen(null);
      } else toast.error(r.error);
    });

  const openSwap = () => {
    setOpen("swap");
    setConflicts([]);
    if (options) return;
    start(async () => {
      const r = await swapOptions(sessionId);
      if (!r.ok) {
        toast.error(r.error);
        setOpen("menu");
        return;
      }
      setOptions(r.options);
      setCurrent(r.current);
    });
  };

  const doSwap = (force: boolean) =>
    start(async () => {
      if (subjectId === "" || !teacherId) return;
      const r = await swapSession(sessionId, { subjectId, teacherId }, force);
      if (r.ok) {
        toast.success(r.message);
        setOpen(null);
      } else if (r.conflicts?.length) setConflicts(r.conflicts);
      else toast.error(r.error);
    });

  const subject = options?.find((o) => o.subjectId === subjectId);
  const title = open === "move" ? "Move this lesson" : open === "cancel" ? "Cancel this lesson" : open === "swap" ? "Swap this lesson" : "Lesson";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(open ? null : "menu")}
        className="p-1.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
        aria-label="Lesson options"
        aria-expanded={!!open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className={clsx("absolute right-0 top-9 z-30 border border-line border-t-[3px] border-t-navy-800 bg-white p-3 shadow-lift", open === "swap" ? "w-[min(22rem,calc(100vw-2rem))]" : "w-72")}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-navy-900">{title}</p>
            <button type="button" onClick={() => setOpen(null)} className="p-0.5 text-navy-300 hover:text-navy-700" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {open === "menu" && (
            <div className="grid gap-1">
              <button type="button" className="px-2 py-2 text-left text-sm text-navy-800 hover:bg-navy-50" onClick={() => setOpen("move")}>
                <CalendarClock className="mr-2 inline h-4 w-4 text-gold-500" /> Move to another time
              </button>
              {canSwap && (
                <button type="button" className="px-2 py-2 text-left text-sm text-navy-800 hover:bg-navy-50" onClick={openSwap}>
                  <ArrowLeftRight className="mr-2 inline h-4 w-4 text-gold-500" /> Swap for another lesson
                </button>
              )}
              <button type="button" className="px-2 py-2 text-left text-sm text-rose-700 hover:bg-rose-50" onClick={() => setOpen("cancel")}>
                <X className="mr-2 inline h-4 w-4" /> Cancel lesson
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
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Move lesson"}
              </button>
            </div>
          )}

          {open === "swap" && (
            <div className="space-y-3">
              {!options ? (
                <p className="flex items-center gap-2 py-3 text-sm text-navy-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects and teachers…
                </p>
              ) : (
                <>
                  {current && (
                    <p className="border-l-[3px] border-gold-500 bg-ivory px-2.5 py-2 text-xs text-navy-700">
                      Instead of <b className="font-semibold text-navy-900">{current.subject}</b> with {current.teacher}, at the same time. Only this lesson changes — the weekly
                      timetable stays as it is.
                    </p>
                  )}
                  <label className="block">
                    <span className="label">Subject</span>
                    <select
                      className="input"
                      value={subjectId}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : "";
                        setSubjectId(id);
                        const first = options.find((o) => o.subjectId === id)?.teachers.find((t) => t.teachesIt && !t.busy);
                        setTeacherId(first?.id ?? "");
                        setConflicts([]);
                      }}
                    >
                      <option value="">Choose a subject…</option>
                      {options.map((o) => (
                        <option key={o.subjectId} value={o.subjectId}>
                          {o.subject}
                          {o.current ? " (same subject, different teacher)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {subject && (
                    <label className="block">
                      <span className="label">Teacher</span>
                      <select
                        className="input"
                        value={teacherId}
                        onChange={(e) => {
                          setTeacherId(e.target.value);
                          setConflicts([]);
                        }}
                      >
                        <option value="">Choose a teacher…</option>
                        <optgroup label={`Teach ${subject.subject}`}>
                          {subject.teachers
                            .filter((t) => t.teachesIt)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} — {t.busy ? "busy" : "free"}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Other teachers">
                          {subject.teachers
                            .filter((t) => !t.teachesIt)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} — {t.busy ? "busy" : "free"}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                      {teacherId && subject.teachers.find((t) => t.id === teacherId)?.busy && (
                        <span className="mt-1 block text-[11px] text-amber-700">{subject.teachers.find((t) => t.id === teacherId)!.busy}</span>
                      )}
                    </label>
                  )}
                  {conflicts.length > 0 && (
                    <div className="border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
                      {conflicts.map((c, i) => (
                        <p key={i}>
                          <b>{c.name}</b> already has {c.label}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {conflicts.length > 0 && (
                      <button type="button" className="btn-ghost flex-1" disabled={pending} onClick={() => doSwap(true)}>
                        Swap anyway
                      </button>
                    )}
                    <button type="button" className="btn-primary flex-1" disabled={pending || subjectId === "" || !teacherId} onClick={() => doSwap(false)}>
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Swap lesson"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {open === "cancel" && (
            <div className="space-y-2">
              <input className="input" placeholder="Reason (optional), e.g. public holiday" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button type="button" className="btn-danger w-full" disabled={pending} onClick={() => run(() => cancelSession(sessionId, reason))}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel lesson"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
