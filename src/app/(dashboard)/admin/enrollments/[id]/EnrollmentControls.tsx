"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, PauseCircle, PlayCircle, Plus, StopCircle, Trash2, Video } from "lucide-react";
import { addSlot, removeSlot, setEnrollmentStatus, setMeetingLink } from "@/lib/actions/schedule";
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

/** The enrollment's standing Google Meet link. Only the office sees the URL; others reach it through Join. */
export function MeetingLinkEditor({ enrollmentId, url, provider }: { enrollmentId: number; url: string | null; provider: string | null }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!url);
  const [value, setValue] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = (next: string | null) =>
    start(async () => {
      const r = await setMeetingLink(enrollmentId, next);
      if (r.ok) {
        toast.success(r.message);
        setEditing(!next);
        setError(null);
        if (!next) setValue("");
      } else setError(r.error);
    });

  if (!editing && url) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
          <Video className="h-4 w-4 shrink-0 text-gold-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-navy-400">{provider}</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-navy-900 hover:underline">
              {url.replace(/^https:\/\//, "")}
            </a>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(true)}>
            Change
          </button>
          <button
            type="button"
            className="btn-ghost text-rose-700"
            disabled={pending}
            onClick={() => confirm("Remove this link? Students and the teacher won’t be able to join until a new one is added.") && save(null)}
          >
            Remove
          </button>
        </div>
        <p className="text-[11px] text-navy-400">Students and the teacher never see this link; Join takes them there and records attendance.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        save(value);
      }}
    >
      <input
        className="input"
        placeholder="https://meet.google.com/abc-defg-hij"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        aria-label="Google Meet link"
      />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2">
        {url && (
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={pending || !value.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save link"}
        </button>
      </div>
      {!url && (
        <p className="text-[11px] text-navy-400">
          Create a Meet in Google Calendar as a recurring event (or meet.google.com → New meeting → Create for later) and paste the link. One link is used for every lesson.
        </p>
      )}
    </form>
  );
}
