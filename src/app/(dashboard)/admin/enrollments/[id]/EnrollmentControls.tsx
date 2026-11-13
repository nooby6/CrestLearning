"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CalendarPlus, Loader2, PauseCircle, PlayCircle, Plus, StopCircle, Trash2 } from "lucide-react";
import { addOneOffSession, addSlot, removeSlot, setEnrollmentStatus, undoSwap } from "@/lib/actions/schedule";
import type { Conflict } from "@/lib/sessions";
import { DURATIONS, formatSlot, fromMinutes, toMinutes } from "@/lib/schedule";
import { ConflictList, SlotFields, durationLabel, emptySlot, type SlotDraft } from "@/components/schedule/SlotFields";

type Slot = { id: number; weekday: SlotDraft["weekday"]; startTime: string; durationMinutes: number };

export function SlotManager({ enrollmentId, slots, active }: { enrollmentId: number; slots: Slot[]; active: boolean }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<number | "add" | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<SlotDraft>(emptySlot());
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const add = (force: boolean) => {
    setBusy("add");
    start(async () => {
      const r = await addSlot(enrollmentId, draft, force);
      setBusy(null);
      if (r.ok) {
        toast.success(r.message);
        setAdding(false);
        setConflicts([]);
        setDraft(emptySlot());
      } else if (r.conflicts?.length) setConflicts(r.conflicts);
      else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-3">
      {slots.length === 0 && !adding && (
        <p className="border border-dashed border-amber-200 bg-amber-50/50 px-3 py-3 text-sm text-amber-800">
          No weekly time — nothing repeats. Add one, or book one-off lessons below.
        </p>
      )}
      {slots.length > 0 && (
        <ul className="divide-y divide-line border border-line">
          {slots.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-medium tabular-nums text-navy-900">{formatSlot(s)}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Remove this weekly time? Its upcoming sessions will be removed. Past sessions are kept.")) return;
                  setBusy(s.id);
                  start(async () => {
                    const r = await removeSlot(s.id);
                    setBusy(null);
                    r.ok ? toast.success(r.message) : toast.error(r.error);
                  });
                }}
                className="p-1.5 text-navy-300 hover:bg-rose-50 hover:text-rose-600"
                aria-label="Remove weekly time"
              >
                {busy === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {active &&
        (adding ? (
          <div className="space-y-3 border border-gold-300 bg-gold-50/40 p-3">
            <SlotFields
              value={draft}
              onChange={(v) => {
                setDraft(v);
                setConflicts([]);
              }}
            />
            {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>
                Cancel
              </button>
              {conflicts.length > 0 && (
                <button type="button" className="btn-ghost" disabled={pending} onClick={() => add(true)}>
                  Add anyway
                </button>
              )}
              <button type="button" className="btn-primary" disabled={pending} onClick={() => add(false)}>
                {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add time"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-ghost" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add weekly time
          </button>
        ))}
    </div>
  );
}

const nairobiToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());

/** Book a single lesson on one date. Nothing repeats; weekly times are unaffected. */
export function OneOffLesson({ enrollmentId, active }: { enrollmentId: number; active: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(nairobiToday());
  const [time, setTime] = useState("16:00");
  const [length, setLength] = useState(60);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const end = /^\d{2}:\d{2}$/.test(time) ? fromMinutes(toMinutes(time) + length) : "—";

  const add = (force: boolean) =>
    start(async () => {
      const r = await addOneOffSession(enrollmentId, { date, startTime: time, durationMinutes: length }, force);
      if (r.ok) {
        toast.success(r.message);
        setOpen(false);
        setConflicts([]);
      } else if (r.conflicts?.length) setConflicts(r.conflicts);
      else toast.error(r.error);
    });

  if (!active) return null;
  if (!open)
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" /> Add one-off lesson
      </button>
    );
  const clear = () => setConflicts([]);
  return (
    <div className="space-y-3 border border-gold-300 bg-gold-50/40 p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 block">
          <span className="label">Date</span>
          <input
            type="date"
            className="input tabular-nums"
            value={date}
            min={nairobiToday()}
            onChange={(e) => {
              setDate(e.target.value);
              clear();
            }}
          />
        </label>
        <label className="block">
          <span className="label">Starts</span>
          <input
            type="time"
            step={900}
            className="input tabular-nums"
            value={time}
            onChange={(e) => {
              setTime(e.target.value);
              clear();
            }}
          />
        </label>
        <label className="block">
          <span className="label">Length</span>
          <select
            className="input"
            value={length}
            onChange={(e) => {
              setLength(Number(e.target.value));
              clear();
            }}
          >
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {durationLabel(m)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs tabular-nums text-navy-500">Ends {end} · happens once, doesn’t repeat</p>
      {conflicts.length > 0 && <ConflictList conflicts={conflicts} />}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        {conflicts.length > 0 && (
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => add(true)}>
            Add anyway
          </button>
        )}
        <button type="button" className="btn-primary" disabled={pending || !date} onClick={() => add(false)}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add lesson"}
        </button>
      </div>
    </div>
  );
}

export function StatusControls({ id, status }: { id: number; status: "ACTIVE" | "PAUSED" | "ENDED" }) {
  const [pending, start] = useTransition();
  const go = (next: "ACTIVE" | "PAUSED" | "ENDED", confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    start(async () => {
      const r = await setEnrollmentStatus(id, next);
      r.ok ? toast.success(r.message) : toast.error(r.error);
    });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {pending && <Loader2 className="h-4 w-4 animate-spin self-center text-navy-300" />}
      {status === "ACTIVE" && (
        <>
          <button className="btn-ghost px-3 py-1.5 text-xs" disabled={pending} onClick={() => go("PAUSED", "Pause this subject? Its upcoming lessons are removed until you resume.")}>
            <PauseCircle className="h-4 w-4" /> Pause
          </button>
          <button className="btn-danger px-3 py-1.5 text-xs" disabled={pending} onClick={() => go("ENDED", "End this subject for the student? Its weekly times stop today and upcoming lessons are removed. History is kept.")}>
            <StopCircle className="h-4 w-4" /> End
          </button>
        </>
      )}
      {status === "PAUSED" && (
        <button className="btn-primary px-3 py-1.5 text-xs" disabled={pending} onClick={() => go("ACTIVE")}>
          <PlayCircle className="h-4 w-4" /> Resume
        </button>
      )}
    </div>
  );
}

/** Put a swapped lesson back (only before the replacement has been taught). */
export function UndoSwap({ originalId }: { originalId: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="border border-line px-2 py-1 text-xs font-medium text-navy-700 hover:border-navy-400 hover:text-navy-900"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await undoSwap(originalId);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Undo swap"}
    </button>
  );
}
