"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, Video } from "lucide-react";
import { setStudentMeetingLink } from "@/lib/actions/schedule";

/** A student's one Google Meet link, shared by all their subjects. Only the office sees the URL; others reach it through Join. */
export function StudentLinkEditor({ studentId, url, provider }: { studentId: string; url: string | null; provider: string | null }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(!url);
  const [value, setValue] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = (next: string | null) =>
    start(async () => {
      const r = await setStudentMeetingLink(studentId, next);
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
            onClick={() => confirm("Remove this link? This student and their teachers won’t be able to join any lesson until a new one is added.") && save(null)}
          >
            Remove
          </button>
        </div>
        <p className="text-[11px] text-navy-400">Used for every subject. The student and teachers never see this link; Join takes them there and records attendance.</p>
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
          Create a Meet in Google Calendar as a recurring event (or meet.google.com → New meeting → Create for later) and paste the link. This one link is used for all of the student’s subjects and teachers.
        </p>
      )}
    </form>
  );
}
