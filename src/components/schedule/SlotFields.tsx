"use client";

import clsx from "clsx";
import { AlertTriangle, MapPin, Video } from "lucide-react";
import type { LessonMode } from "./ModeTag";
import type { Conflict } from "@/lib/sessions";
import { DURATIONS, WEEKDAYS, fromMinutes, toMinutes } from "@/lib/schedule";

export type SlotDraft = {
  weekday: (typeof WEEKDAYS)[number]["value"];
  startTime: string;
  durationMinutes: number;
  mode: LessonMode;
  room: string;
};

export const durationLabel = (m: number) =>
  m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;

export const emptySlot = (): SlotDraft => ({ weekday: "MONDAY", startTime: "16:00", durationMinutes: 60, mode: "ONLINE", room: "" });

/** Online or in person, with a room box for in person. */
export function ModePicker({
  mode,
  room,
  onChange,
  size = "md",
}: {
  mode: LessonMode;
  room: string;
  onChange: (v: { mode: LessonMode; room: string }) => void;
  size?: "sm" | "md";
}) {
  const opt = (m: LessonMode, Icon: typeof Video, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === m}
      onClick={() => onChange({ mode: m, room })}
      className={clsx(
        "flex flex-1 items-center justify-center gap-1.5 font-medium transition-colors focus-visible:relative focus-visible:z-10",
        size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
        mode === m
          ? m === "IN_PERSON"
            ? "bg-gold-500 text-navy-950"
            : "bg-navy-800 text-white"
          : "bg-white text-navy-600 hover:bg-navy-50",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <div role="radiogroup" aria-label="Where the lesson happens" className="flex min-w-[13rem] flex-1 divide-x divide-line border border-line">
        {opt("ONLINE", Video, "Online")}
        {opt("IN_PERSON", MapPin, "In person")}
      </div>
      {mode === "IN_PERSON" && (
        <input
          className={clsx("input min-w-[10rem] flex-1", size === "sm" && "py-1.5 text-xs")}
          value={room}
          maxLength={60}
          onChange={(e) => onChange({ mode, room: e.target.value })}
          placeholder="Room (optional), e.g. Lab 1"
          aria-label="Room"
        />
      )}
    </div>
  );
}

/** Day · start · length, with the computed end time shown so nobody does mental arithmetic. */
export function SlotFields({ value, onChange }: { value: SlotDraft; onChange: (v: SlotDraft) => void }) {
  const end = /^\d{2}:\d{2}$/.test(value.startTime) ? fromMinutes(toMinutes(value.startTime) + value.durationMinutes) : "—";
  return (
    <div className="@container">
    <div className="grid grid-cols-2 items-center gap-2 @lg:grid-cols-[1.2fr_1fr_1fr_auto]">
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
      <span className="whitespace-nowrap text-xs tabular-nums text-navy-400 @lg:w-20">ends {end}</span>
    </div>
    <div className="mt-2">
      <ModePicker mode={value.mode} room={value.room} onChange={(m) => onChange({ ...value, ...m })} size="sm" />
    </div>
    </div>
  );
}

export function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  return (
    <div className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
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
