"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Check, Loader2 } from "lucide-react";
import { saveLessonRecord } from "@/lib/actions/lessons";

export type ExistingRecord = { topicsCovered: string; homework: string | null; homeworkDue: string | null } | null;

/**
 * The mandatory record a teacher completes after every lesson:
 * topics covered (required) and any homework set.
 */
export function LessonRecordForm({
  sessionId,
  existing,
  onSaved,
  compact = false,
  submitLabel,
}: {
  sessionId: number;
  existing: ExistingRecord;
  onSaved?: () => void;
  compact?: boolean;
  submitLabel?: string;
}) {
  const [topics, setTopics] = useState(existing?.topicsCovered ?? "");
  const [homework, setHomework] = useState(existing?.homework ?? "");
  const [due, setDue] = useState(existing?.homeworkDue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!existing);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await saveLessonRecord(sessionId, { topicsCovered: topics, homework, homeworkDue: due });
      if (!r.ok) {
        setError(r.fieldErrors?.topicsCovered ?? r.error);
        return;
      }
      setSaved(true);
      toast.success(r.message);
      onSaved?.();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label" htmlFor={`topics-${sessionId}`}>
          Topics covered <span className="text-rose-600">*</span>
        </label>
        <textarea
          id={`topics-${sessionId}`}
          rows={compact ? 3 : 4}
          className="input resize-y"
          placeholder="e.g. Simultaneous equations by elimination; worked examples 1–6; started word problems."
          value={topics}
          onChange={(e) => {
            setTopics(e.target.value);
            setError(null);
            setSaved(false);
          }}
          aria-invalid={!!error}
          required
        />
        {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
        <div>
          <label className="label" htmlFor={`hw-${sessionId}`}>
            Homework set <span className="font-normal text-navy-300">optional</span>
          </label>
          <input
            id={`hw-${sessionId}`}
            className="input"
            placeholder="e.g. Exercise 4B, questions 1–10"
            value={homework}
            onChange={(e) => {
              setHomework(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div>
          <label className="label" htmlFor={`due-${sessionId}`}>
            Due
          </label>
          <input
            id={`due-${sessionId}`}
            type="date"
            className="input"
            value={due}
            disabled={!homework}
            onChange={(e) => {
              setDue(e.target.value);
              setSaved(false);
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {saved && !pending && (
          <span className="flex items-center gap-1 text-xs text-emerald-700">
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        <button type="submit" className="btn-primary min-w-[150px]" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel ?? (existing ? "Update record" : "Save lesson record")}
        </button>
      </div>
    </form>
  );
}
