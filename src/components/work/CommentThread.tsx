"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { CheckCircle2, Hand, Loader2, MessageSquare, RotateCcw, Send, Trash2 } from "lucide-react";
import { addComment, deleteComment, resolveRequest } from "@/lib/actions/work";
import { Avatar } from "@/components/ui/primitives";
import type { ThreadComment } from "@/lib/work-queries";

const ROLE_WORD: Record<string, string> = {
  ADMIN: "Office",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
};

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Africa/Nairobi",
  }).format(new Date(iso));

/**
 * Comments about a student's work. Visible to the student, their parents, their teacher and the office —
 * the note under the box says so, so nobody mistakes it for a private message.
 */
export function CommentThread({
  comments,
  enrollmentId,
  resourceId,
  meId,
  canResolve = false,
  canRequest = false,
  showResourceTitles = false,
  placeholder = "Ask a question or leave a comment…",
}: {
  comments: ThreadComment[];
  enrollmentId: number;
  resourceId?: number;
  meId: string;
  canResolve?: boolean;
  canRequest?: boolean;
  showResourceTitles?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [asRequest, setAsRequest] = useState(false);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  const post = () =>
    start(async () => {
      const r = await addComment({
        enrollmentId,
        resourceId,
        body,
        kind: asRequest ? "REQUEST" : "COMMENT",
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setBody("");
      setAsRequest(false);
      router.refresh();
    });

  const act = (id: number, fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) => {
    setBusyId(id);
    start(async () => {
      const r = await fn();
      setBusyId(null);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.refresh();
    });
  };

  return (
    <div>
      {comments.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-ivory px-3 py-3 text-sm text-navy-400">
          <MessageSquare className="h-4 w-4" /> No comments yet.
        </p>
      ) : (
        <ol className="space-y-3">
          {comments.map((c) => {
            const request = c.kind === "REQUEST";
            return (
              <li key={c.id} className="fade-in flex gap-3">
                <Avatar person={c.author} size="sm" />
                <div
                  className={clsx(
                    "min-w-0 flex-1 rounded-xl border px-3.5 py-2.5",
                    request
                      ? c.resolvedAt
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-gold-300 bg-gold-50/70"
                      : c.author.id === meId
                        ? "border-navy-100 bg-navy-50/50"
                        : "border-line bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-navy-400">
                    <span className="text-xs font-semibold text-navy-900">
                      {c.author.firstName} {c.author.lastName}
                    </span>
                    <span>{ROLE_WORD[c.author.role] ?? ""}</span>
                    <span>·</span>
                    <span>{when(c.createdAt)}</span>
                    {request && (
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 rounded-full px-1.5 py-px font-semibold",
                          c.resolvedAt ? "bg-emerald-100 text-emerald-700" : "bg-gold-200/70 text-gold-800",
                        )}
                      >
                        {c.resolvedAt ? <CheckCircle2 className="h-3 w-3" /> : <Hand className="h-3 w-3" />}
                        {c.resolvedAt ? "Request done" : "Worksheet request"}
                      </span>
                    )}
                  </div>
                  {showResourceTitles && c.resource && <p className="mt-0.5 text-[11px] font-medium text-gold-700">On “{c.resource.title}”</p>}
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-navy-800">{c.body}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 empty:hidden">
                    {request && canResolve && (
                      <button
                        type="button"
                        onClick={() => act(c.id, () => resolveRequest(c.id))}
                        disabled={busyId === c.id}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        {busyId === c.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : c.resolvedAt ? (
                          <RotateCcw className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {c.resolvedAt ? "Reopen" : "Mark done"}
                      </button>
                    )}
                    {c.author.id === meId && (
                      <button
                        type="button"
                        onClick={() => confirm("Delete this comment?") && act(c.id, () => deleteComment(c.id))}
                        className="inline-flex items-center gap-1 text-[11px] text-navy-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) post();
        }}
      >
        <div
          className={clsx(
            "rounded-xl border bg-white transition focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-200",
            asRequest ? "border-gold-300" : "border-line",
          )}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={asRequest ? "What would you like more practice on?" : placeholder}
            rows={2}
            maxLength={2000}
            className="block w-full resize-y rounded-t-xl border-0 bg-transparent px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-0"
          />
          <div className="flex items-center justify-between gap-2 border-t border-line px-2.5 py-2">
            {canRequest ? (
              <button
                type="button"
                onClick={() => setAsRequest((v) => !v)}
                aria-pressed={asRequest}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
                  asRequest ? "bg-gold-500 text-white" : "bg-gold-50 text-gold-800 hover:bg-gold-100",
                )}
              >
                <Hand className="h-3.5 w-3.5" /> {asRequest ? "Requesting more worksheets" : "Request more worksheets"}
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn-primary px-3 py-1.5 text-xs" disabled={pending || !body.trim()}>
              {pending && busyId === null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {asRequest ? "Send request" : "Post"}
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-navy-400">Seen by the student, their parents, their teacher and the Crest office.</p>
      </form>
    </div>
  );
}
