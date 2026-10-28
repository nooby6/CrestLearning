"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Award, CheckCircle2, Loader2, RotateCcw, Send } from "lucide-react";
import { turnIn, unsubmit } from "@/lib/actions/work";
import { FileDrop } from "./FileDrop";
import { FileChip, type FileInfo } from "./FileChip";

export type SubmissionView = {
  status: "SUBMITTED" | "REVIEWED";
  note: string | null;
  submittedAt: string;
  feedback: string | null;
  mark: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  files: FileInfo[];
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));

export function Feedback({ s }: { s: SubmissionView }) {
  if (s.status !== "REVIEWED") return null;
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
          <Award className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-emerald-900">Marked{s.reviewedBy ? ` by ${s.reviewedBy}` : ""}</p>
            {s.mark && <span className="font-display text-lg font-semibold text-emerald-800">{s.mark}</span>}
          </div>
          {s.reviewedAt && <p className="text-[11px] text-emerald-700/80">{when(s.reviewedAt)}</p>}
          {s.feedback && <p className="mt-2 whitespace-pre-wrap text-sm text-navy-800">{s.feedback}</p>}
        </div>
      </div>
    </div>
  );
}

/** The student's side of a worksheet: attach work, turn it in, undo, and see the marking. */
export function TurnInPanel({ resourceId, submission, overdue }: { resourceId: number; submission: SubmissionView | null; overdue: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(!submission);
  const [files, setFiles] = useState<FileInfo[]>(submission?.files ?? []);
  const [note, setNote] = useState(submission?.note ?? "");

  const send = () =>
    start(async () => {
      const r = await turnIn(resourceId, {
        fileIds: files.map((f) => f.id),
        note: note || undefined,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setEditing(false);
      router.refresh();
    });

  const undo = () =>
    start(async () => {
      const r = await unsubmit(resourceId);
      if (!r.ok) return void toast.error(r.error);
      toast.info(r.message);
      setEditing(true);
      router.refresh();
    });

  if (submission && !editing) {
    return (
      <div className="space-y-4">
        <Feedback s={submission} />
        <div className="flex items-center gap-2 text-sm text-navy-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            Turned in <b>{when(submission.submittedAt)}</b>
          </span>
        </div>
        {submission.files.length > 0 && (
          <div className="space-y-2">
            {submission.files.map((f) => (
              <FileChip key={f.id} file={f} />
            ))}
          </div>
        )}
        {submission.note && <p className="whitespace-pre-wrap rounded-lg bg-ivory px-3 py-2.5 text-sm text-navy-700">{submission.note}</p>}
        {submission.status === "SUBMITTED" && (
          <button type="button" onClick={undo} disabled={pending} className="btn-ghost w-full">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Undo turn in to make changes
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {overdue && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">This is past its due date — turn it in as soon as you can.</p>
      )}
      <div>
        <p className="label">Your work</p>
        <FileDrop
          purpose="submission"
          value={files}
          onChange={setFiles}
          multiple
          onBusyChange={setBusy}
          hint="Photos of your pages, a PDF or a Word file · up to 4 MB each"
        />
      </div>
      <div>
        <label className="label" htmlFor="note">
          Note to your teacher <span className="font-normal text-navy-400">optional</span>
        </label>
        <textarea
          id="note"
          className="input min-h-[72px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. I wasn’t sure about question 7."
        />
      </div>
      <button type="submit" className="btn-gold w-full py-2.5" disabled={pending || busy || (!files.length && !note.trim())}>
        {pending || busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {busy ? "Uploading…" : "Turn in"}
      </button>
    </form>
  );
}
