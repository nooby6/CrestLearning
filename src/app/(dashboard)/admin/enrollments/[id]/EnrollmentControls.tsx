"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, PauseCircle, PlayCircle, Plus, StopCircle, Trash2 } from "lucide-react";
import { addSlot, removeSlot, setEnrollmentStatus } from "@/lib/actions/schedule";
import type { Conflict } from "@/lib/sessions";
import { formatSlot } from "@/lib/schedule";
import { ConflictList, SlotFields, emptySlot, type SlotDraft } from "@/components/schedule/SlotFields";

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
        <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-3 text-sm text-amber-800">
          No weekly time yet, so no sessions are being created.
        </p>
      )}
      {slots.length > 0 && (
        <ul className="divide-y divide-line rounded-lg border border-line">
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
                className="rounded-md p-1.5 text-navy-300 hover:bg-rose-50 hover:text-rose-600"
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
          <div className="space-y-3 rounded-xl border border-gold-200 bg-gold-50/40 p-3">
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
          <button className="btn-ghost" disabled={pending} onClick={() => go("PAUSED", "Pause this enrollment? Upcoming sessions are removed until you resume.")}>
            <PauseCircle className="h-4 w-4" /> Pause
          </button>
          <button className="btn-danger" disabled={pending} onClick={() => go("ENDED", "End this enrollment? Weekly times stop today and upcoming sessions are removed. History is kept.")}>
            <StopCircle className="h-4 w-4" /> End
          </button>
        </>
      )}
      {status === "PAUSED" && (
        <button className="btn-primary" disabled={pending} onClick={() => go("ACTIVE")}>
          <PlayCircle className="h-4 w-4" /> Resume
        </button>
      )}
    </div>
  );
}
