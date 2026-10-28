"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, Clock3, Loader2, RotateCcw } from "lucide-react";
import { reopenSubmission, reviewSubmission } from "@/lib/actions/work";
import { FileChip } from "./FileChip";
import { Feedback, type SubmissionView } from "./TurnInPanel";

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

/** The teacher's side: the student's files and note, then feedback and a mark. */
export function ReviewPanel({
  submissionId,
  submission,
  studentName,
  late,
}: {
  submissionId: number;
  submission: SubmissionView;
  studentName: string;
  late: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(submission.status !== "REVIEWED");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [mark, setMark] = useState(submission.mark ?? "");

  const save = () =>
    start(async () => {
      const r = await reviewSubmission(submissionId, {
        feedback: feedback || undefined,
        mark: mark || undefined,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setEditing(false);
      router.refresh();
    });
  const reopen = () =>
    start(async () => {
      const r = await reopenSubmission(submissionId);
      if (!r.ok) return void toast.error(r.error);
      toast.info(r.message);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2 text-sm text-navy-700">
        <Clock3 className="h-4 w-4 text-navy-400" /> Turned in {when(submission.submittedAt)}
        {late && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-rose-100">Late</span>}
      </p>
      {submission.files.length > 0 ? (
        <div className="space-y-2">
          {submission.files.map((f) => (
            <FileChip key={f.id} file={f} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-navy-400">No files — see {studentName}’s note.</p>
      )}
      {submission.note && (
        <div className="rounded-lg bg-ivory px-3 py-2.5">
          <p className="text-[11px] font-medium text-navy-400">{studentName}’s note</p>
          <p className="whitespace-pre-wrap text-sm text-navy-800">{submission.note}</p>
        </div>
      )}

      {editing ? (
        <form
          className="space-y-3 border-t border-line pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div>
              <label className="label" htmlFor="fb">
                Feedback
              </label>
              <textarea
                id="fb"
                className="input min-h-[96px]"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What went well, and what to work on next"
              />
            </div>
            <div>
              <label className="label" htmlFor="mk">
                Mark <span className="font-normal text-navy-400">optional</span>
              </label>
              <input id="mk" className="input" value={mark} onChange={(e) => setMark(e.target.value)} placeholder="e.g. 8/10" maxLength={40} />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {submission.status === "REVIEWED" ? "Update feedback" : "Mark as reviewed"}
          </button>
          <p className="text-[11px] text-navy-400">{studentName} and their parents will see your feedback.</p>
        </form>
      ) : (
        <div className="space-y-3 border-t border-line pt-4">
          <Feedback s={submission} />
          <div className="flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(true)}>
              Edit feedback
            </button>
            <button type="button" className="btn-ghost" onClick={reopen} disabled={pending} title="Let the student change and turn it in again">
              <RotateCcw className="h-4 w-4" /> Reopen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
