"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { saveWeeklyReport } from "@/lib/actions/lessons";

const EFFORT = ["Needs attention", "Inconsistent", "Steady", "Strong", "Excellent"];

export function WeeklyReportForm({
  enrollmentId,
  weekStart,
  studentFirstName,
  existing,
}: {
  enrollmentId: number;
  weekStart: string;
  studentFirstName: string;
  existing: { summary: string; strengths: string | null; nextSteps: string | null; effort: number | null } | null;
}) {
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [strengths, setStrengths] = useState(existing?.strengths ?? "");
  const [nextSteps, setNextSteps] = useState(existing?.nextSteps ?? "");
  const [effort, setEffort] = useState<number | undefined>(existing?.effort ?? undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setErrors({});
        start(async () => {
          const r = await saveWeeklyReport({ enrollmentId, weekStart, summary, strengths, nextSteps, effort });
          if (r.ok) toast.success(r.message);
          else {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
          }
        });
      }}
    >
      <div>
        <label className="label">
          Progress this week <span className="text-rose-600">*</span>
        </label>
        <textarea
          rows={4}
          className="input resize-y"
          placeholder={`How did ${studentFirstName} progress this week? Mention understanding, participation and homework.`}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        {errors.summary && <p className="mt-1 text-xs text-rose-600">{errors.summary}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">
            Strengths <span className="font-normal text-navy-300">optional</span>
          </label>
          <textarea rows={2} className="input resize-y" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </div>
        <div>
          <label className="label">
            Focus for next week <span className="font-normal text-navy-300">optional</span>
          </label>
          <textarea rows={2} className="input resize-y" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} />
        </div>
      </div>
      <div>
        <p className="label">Effort and engagement</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Effort and engagement">
          {EFFORT.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={effort === i + 1}
              onClick={() => setEffort(effort === i + 1 ? undefined : i + 1)}
              className={clsx(
              " border px-3 py-1 text-xs font-medium transition",
                effort === i + 1 ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-navy-600 hover:border-navy-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary min-w-[150px]" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : existing ? "Update report" : "Submit report"}
        </button>
      </div>
    </form>
  );
}
