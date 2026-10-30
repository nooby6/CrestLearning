"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "react-toastify";
import clsx from "clsx";
import { Loader2, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { deleteAnnouncement, markAllRead, postAnnouncement, togglePin } from "@/lib/actions/announcements";
import { PersonPicker, type PickerOption } from "@/components/ui/PersonPicker";

const AUDIENCES = [
  { value: "EVERYONE", label: "Everyone", hint: "Teachers, parents and students" },
  { value: "TEACHERS", label: "Teachers", hint: "All teachers" },
  { value: "PARENTS", label: "All parents", hint: "Every parent account" },
  { value: "SPECIFIC_PARENTS", label: "Selected parents", hint: "Only the parents you choose" },
] as const;
type Audience = (typeof AUDIENCES)[number]["value"];

export function AnnouncementComposer({ parents }: { parents: PickerOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("EVERYONE");
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [expiresOn, setExpiresOn] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await postAnnouncement({ title, body, audience, parentIds, pinned, expiresOn: expiresOn || undefined });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setTitle("");
          setBody("");
          setParentIds([]);
          setPinned(false);
          setExpiresOn("");
          router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="label">Send to</legend>
        <div className="grid gap-px border border-line bg-line sm:grid-cols-4">
          {AUDIENCES.map((a) => (
            <label key={a.value} className={clsx("cursor-pointer px-3 py-2.5 transition-colors", audience === a.value ? "bg-navy-800 text-white" : "bg-white text-navy-800 hover:bg-ivory")}>
              <input type="radio" name="audience" className="sr-only" checked={audience === a.value} onChange={() => setAudience(a.value)} />
              <span className="block text-sm font-semibold">{a.label}</span>
              <span className={clsx("block text-[11px]", audience === a.value ? "text-navy-100" : "text-navy-400")}>{a.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {audience === "SPECIFIC_PARENTS" && (
        <div>
          <span className="label">Parents</span>
          <PersonPicker options={parents} value={parentIds} onChange={setParentIds} placeholder="Search parents…" />
        </div>
      )}
      <label className="block">
        <span className="label">Title</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g. Half-term break: no lessons 2–6 November" required />
      </label>
      <label className="block">
        <span className="label">Message</span>
        <textarea className="input min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required />
      </label>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="label">
            Show until <span className="font-normal text-navy-400">optional</span>
          </span>
          <input type="date" className="input" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-navy-800">
          <input type="checkbox" className="h-4 w-4 accent-navy-800" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top
        </label>
        <button type="submit" className="btn-primary ml-auto" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send announcement
        </button>
      </div>
    </form>
  );
}

export function AnnouncementRowActions({ id, pinned }: { id: number; pinned: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  return (
    <div className="flex gap-1">
      <button type="button" disabled={pending} title={pinned ? "Unpin" : "Pin"} className="border border-line p-1.5 text-navy-500 hover:border-navy-400 hover:text-navy-900" onClick={() => run(() => togglePin(id))}>
        {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        disabled={pending}
        title="Delete"
        className="border border-line p-1.5 text-navy-500 hover:border-rose-400 hover:text-rose-700"
        onClick={() => confirm("Delete this announcement for everyone?") && run(() => deleteAnnouncement(id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Opening the announcements page marks them read (once). */
export function MarkAnnouncementsRead({ unread }: { unread: number }) {
  const done = useRef(false);
  useEffect(() => {
    if (unread > 0 && !done.current) {
      done.current = true;
      void markAllRead();
    }
  }, [unread]);
  return null;
}
