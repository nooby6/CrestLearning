"use client";

import { AlertTriangle } from "lucide-react";
import type { Conflict } from "@/lib/sessions";
import { DURATIONS, WEEKDAYS, fromMinutes, toMinutes } from "@/lib/schedule";

export type SlotDraft = { weekday: (typeof WEEKDAYS)[number]["value"]; startTime: string; durationMinutes: number };

export const durationLabel = (m: number) =>
  m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;

export const emptySlot = (): SlotDraft => ({ weekday: "MONDAY", startTime: "16:00", durationMinutes: 60 });

/** Day · start · length, with the computed end time shown so nobody does mental arithmetic. */
export function SlotFields({ value, onChange }: { value: SlotDraft; onChange: (v: SlotDraft) => void }) {
  const end = /^\d{2}:\d{2}$/.test(value.startTime) ? fromMinutes(toMinutes(value.startTime) + value.durationMinutes) : "—";
  return (
    <div className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
      <select
        className="input"
        value={value.weekday}
        onChange={(e) => onChange({ ...value, weekday: e.target.value as SlotDraft["weekday"] })}
        aria-label="Day"
      >
        {WEEKDAYS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>
      <input
        type="time"
        step={900}
        className="input tabular-nums"
        value={value.startTime}
        onChange={(e) => onChange({ ...value, startTime: e.target.value })}
        aria-label="Start time"
      />
      <select
        className="input"
        value={value.durationMinutes}
        onChange={(e) => onChange({ ...value, durationMinutes: Number(e.target.value) })}
        aria-label="Length"
      >
        {DURATIONS.map((m) => (
          <option key={m} value={m}>
            {durationLabel(m)}
          </option>
        ))}
      </select>
      <span className="text-xs tabular-nums text-navy-400 sm:w-20">ends {end}</span>
    </div>
  );
}

export function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" /> Time clash
      </p>
      <ul className="mt-1.5 space-y-0.5 text-xs">
        {conflicts.map((c, i) => (
          <li key={i}>
            {c.name} ({c.who}) already has {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
