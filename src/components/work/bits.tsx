import clsx from "clsx";
import { AlertTriangle, Award, CheckCircle2, CircleDashed, ClipboardList, FileText } from "lucide-react";
import { dbDateKey, dateKey, addDaysKey } from "@/lib/schedule";
import { WORK_STATE_LABEL, type WorkState } from "@/lib/work";

const STATE_STYLE: Record<WorkState, { cls: string; icon: typeof CheckCircle2 }> = {
  todo: { cls: "bg-sky-50 text-sky-700 ring-sky-100", icon: CircleDashed },
  overdue: {
    cls: "bg-rose-50 text-rose-700 ring-rose-100",
    icon: AlertTriangle,
  },
  submitted: {
    cls: "bg-gold-50 text-gold-800 ring-gold-200",
    icon: CheckCircle2,
  },
  reviewed: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    icon: Award,
  },
};

export function WorkStateBadge({ state, mark }: { state: WorkState; mark?: string | null }) {
  const s = STATE_STYLE[state];
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", s.cls)}>
      <s.icon className="h-3 w-3" />
      {WORK_STATE_LABEL[state]}
      {state === "reviewed" && mark ? ` · ${mark}` : ""}
    </span>
  );
}

export function KindIcon({ kind, size = "md" }: { kind: "DOCUMENT" | "WORKSHEET"; size?: "md" | "lg" }) {
  const Icon = kind === "WORKSHEET" ? ClipboardList : FileText;
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center border",
        size === "lg" ? "h-12 w-12" : "h-10 w-10",
        kind === "WORKSHEET" ? "border-gold-300 bg-gold-50 text-gold-700" : "border-navy-200 bg-navy-50 text-navy-700",
      )}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.75} />
    </span>
  );
}

const dayFmt = new Intl.DateTimeFormat("en-KE", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Due today", "Due tomorrow", "Due Fri 31 Oct". */
export function dueLabel(due: Date | null): string | null {
  if (!due) return null;
  const k = dbDateKey(due);
  const today = dateKey(new Date());
  if (k === today) return "Due today";
  if (k === addDaysKey(today, 1)) return "Due tomorrow";
  return `${k < today ? "Was due" : "Due"} ${dayFmt.format(due)}`;
}
