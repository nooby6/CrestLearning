"use client";

import clsx from "clsx";
import { Check, Lock } from "lucide-react";

export type CheckOption<T extends string | number> = {
  id: T;
  label: string;
  /** Shown under the label, e.g. "3 students". */
  hint?: string;
  /** Ticked and can't be unticked, with the reason as a tooltip. */
  lockedReason?: string;
};

/** A grid of tick boxes for picking several items, e.g. subjects or teachers. */
export function CheckList<T extends string | number>({
  options,
  value,
  onChange,
  empty = "Nothing to choose from yet.",
  columns = 2,
}: {
  options: CheckOption<T>[];
  value: T[];
  onChange: (v: T[]) => void;
  empty?: string;
  /** One column for narrow places such as a side panel. */
  columns?: 1 | 2;
}) {
  if (!options.length) return <p className="text-sm text-navy-400">{empty}</p>;
  return (
    <div className={clsx("grid gap-1.5", columns === 2 && "sm:grid-cols-2")}>
      {options.map((o) => {
        const on = value.includes(o.id) || !!o.lockedReason;
        return (
          <button
            key={o.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-disabled={!!o.lockedReason}
            title={o.lockedReason}
            onClick={() => {
              if (o.lockedReason) return;
              onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id]);
            }}
            className={clsx(
              "flex items-center gap-2.5 border px-3 py-2 text-left text-sm transition-colors",
              on ? "border-navy-800 bg-navy-50/60" : "border-line hover:border-navy-300",
              o.lockedReason && "cursor-not-allowed",
            )}
          >
            <span className={clsx("grid h-4 w-4 shrink-0 place-items-center border", on ? "border-navy-800 bg-navy-800 text-white" : "border-navy-300 bg-white")}>
              {on && (o.lockedReason ? <Lock className="h-2.5 w-2.5" /> : <Check className="h-3 w-3" strokeWidth={3} />)}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-navy-900">{o.label}</span>
              {(o.hint || o.lockedReason) && <span className="block truncate text-[11px] text-navy-400">{o.lockedReason ?? o.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
