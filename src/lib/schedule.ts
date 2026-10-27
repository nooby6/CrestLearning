/**
 * Scheduling maths — pure functions, no database.
 *
 * Slots store wall-clock time ("16:30") in an IANA zone (Crest: Africa/Nairobi).
 * Sessions are stored as UTC instants. All conversions go through the zone so the
 * code stays correct if a slot is ever set in a zone with daylight saving.
 */
import type { Weekday } from "@prisma/client";

export const TZ = "Africa/Nairobi";

/** ISO order: Monday = 1 … Sunday = 7 */
export const WEEKDAYS: { value: Weekday; label: string; short: string; iso: number }[] = [
  { value: "MONDAY", label: "Monday", short: "Mon", iso: 1 },
  { value: "TUESDAY", label: "Tuesday", short: "Tue", iso: 2 },
  { value: "WEDNESDAY", label: "Wednesday", short: "Wed", iso: 3 },
  { value: "THURSDAY", label: "Thursday", short: "Thu", iso: 4 },
  { value: "FRIDAY", label: "Friday", short: "Fri", iso: 5 },
  { value: "SATURDAY", label: "Saturday", short: "Sat", iso: 6 },
  { value: "SUNDAY", label: "Sunday", short: "Sun", iso: 7 },
];

export const weekdayIso = (w: Weekday) => WEEKDAYS.find((d) => d.value === w)!.iso;
export const weekdayLabel = (w: Weekday) => WEEKDAYS.find((d) => d.value === w)!.label;
export const weekdayShort = (w: Weekday) => WEEKDAYS.find((d) => d.value === w)!.short;

export const DURATIONS = [30, 45, 60, 75, 90, 120];

/** "16:30" → 990 */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** 990 → "16:30" */
export const fromMinutes = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export const isHHMM = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** Civil date in a zone — { y, m (1-12), d, iso weekday, minutes since midnight }. */
export function partsInZone(date: Date, tz = TZ) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  const iso = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[p.weekday as "Mon"];
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    iso,
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

/** Offset (ms) of `tz` from UTC at instant `date`. Nairobi is always +3h. */
function zoneOffsetMs(date: Date, tz: string) {
  const p = partsInZone(date, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, Math.floor(p.minutes / 60), p.minutes % 60);
  return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** Wall-clock date + time in a zone → UTC instant. */
export function zonedToUtc(y: number, m: number, d: number, hhmm: string, tz = TZ) {
  const mins = toMinutes(hhmm);
  const guess = new Date(Date.UTC(y, m - 1, d, Math.floor(mins / 60), mins % 60));
  const first = new Date(guess.getTime() - zoneOffsetMs(guess, tz));
  // Second pass settles DST edges.
  return new Date(guess.getTime() - zoneOffsetMs(first, tz));
}

/** "2026-10-27" for an instant, in the zone. */
export function dateKey(date: Date, tz = TZ) {
  const p = partsInZone(date, tz);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** Add days to a civil date key (calendar arithmetic, zone-independent). */
export function addDaysKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function isoWeekdayOfKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 ? 7 : wd;
}

/** Monday of the week containing `key`. */
export const mondayOf = (key: string) => addDaysKey(key, 1 - isoWeekdayOfKey(key));

export const keyToUtcStart = (key: string, tz = TZ) => {
  const [y, m, d] = key.split("-").map(Number);
  return zonedToUtc(y, m, d, "00:00", tz);
};

/** A @db.Date value (stored as UTC midnight) → civil key. */
export const dbDateKey = (d: Date) => d.toISOString().slice(0, 10);

export type SlotLike = {
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  validFrom: Date; // @db.Date
  validUntil: Date | null; // @db.Date, inclusive
};

/**
 * All occurrences of a weekly slot whose start falls in [fromKey, toKey] (civil dates, inclusive),
 * respecting the slot's validity window.
 */
export function occurrences(slot: SlotLike, fromKey: string, toKey: string) {
  const start = dbDateKey(slot.validFrom) > fromKey ? dbDateKey(slot.validFrom) : fromKey;
  const end = slot.validUntil && dbDateKey(slot.validUntil) < toKey ? dbDateKey(slot.validUntil) : toKey;
  const out: { startsAt: Date; endsAt: Date }[] = [];
  if (start > end) return out;
  let key = addDaysKey(start, (weekdayIso(slot.weekday) - isoWeekdayOfKey(start) + 7) % 7);
  while (key <= end) {
    const [y, m, d] = key.split("-").map(Number);
    const startsAt = zonedToUtc(y, m, d, slot.startTime, slot.timezone);
    out.push({ startsAt, endsAt: new Date(startsAt.getTime() + slot.durationMinutes * 60_000) });
    key = addDaysKey(key, 7);
  }
  return out;
}

/** Do two weekly slots collide (same weekday, overlapping minutes)? Assumes one zone. */
export function slotsOverlap(
  a: { weekday: Weekday; startTime: string; durationMinutes: number },
  b: { weekday: Weekday; startTime: string; durationMinutes: number },
) {
  if (a.weekday !== b.weekday) return false;
  const a0 = toMinutes(a.startTime);
  const b0 = toMinutes(b.startTime);
  return a0 < b0 + b.durationMinutes && b0 < a0 + a.durationMinutes;
}

/** Unguessable video room name, e.g. "crest-math-7f3k9q2xw1". */
export function meetingRoomName(subjectCode: string) {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
  return `crest-${subjectCode.toLowerCase()}-${id}`;
}

const timeFmt = new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ });
export const formatTime = (d: Date) => timeFmt.format(d);
export const formatTimeRange = (a: Date, b: Date) => `${formatTime(a)}–${formatTime(b)}`;

export const formatSlot = (s: { weekday: Weekday; startTime: string; durationMinutes: number }) =>
  `${weekdayShort(s.weekday)} ${s.startTime}–${fromMinutes(toMinutes(s.startTime) + s.durationMinutes)}`;

export const hoursLabel = (minutes: number) => {
  const h = minutes / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
};
