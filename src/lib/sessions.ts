import "server-only";
import type { Prisma, Weekday } from "@prisma/client";
import prisma from "./prisma";
import { TZ, addDaysKey, dateKey, fromMinutes, meetingRoomName, occurrences, slotsOverlap, toMinutes } from "./schedule";

/** How far ahead sessions are materialised. The daily cron keeps this rolling. */
export const HORIZON_WEEKS = 6;

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Create missing SessionInstances for one slot, from today to the horizon.
 * Idempotent: @@unique([slotId, startsAt]) + skipDuplicates.
 */
export async function generateForSlot(slotId: number, db: Tx = prisma, horizonWeeks = HORIZON_WEEKS) {
  const slot = await db.sessionSlot.findUnique({
    where: { id: slotId },
    include: { enrollment: { include: { subject: true } } },
  });
  if (!slot || !slot.active || slot.enrollment.status !== "ACTIVE") return 0;

  const today = dateKey(new Date(), slot.timezone);
  const now = Date.now();
  const occ = occurrences(slot, today, addDaysKey(today, horizonWeeks * 7)).filter((o) => o.startsAt.getTime() > now);
  if (!occ.length) return 0;

  const res = await db.sessionInstance.createMany({
    data: occ.map((o) => ({
      enrollmentId: slot.enrollmentId,
      slotId: slot.id,
      startsAt: o.startsAt,
      endsAt: o.endsAt,
      meetingRoom: meetingRoomName(slot.enrollment.subject.code),
    })),
    skipDuplicates: true,
  });
  return res.count;
}

/** Roll the horizon forward for every active slot (daily cron). */
export async function generateAll() {
  const slots = await prisma.sessionSlot.findMany({
    where: { active: true, enrollment: { status: "ACTIVE" } },
    select: { id: true },
  });
  let created = 0;
  for (const s of slots) created += await generateForSlot(s.id);
  return { slots: slots.length, created };
}

/**
 * Remove future, still-scheduled sessions (e.g. slot removed, enrollment paused).
 * Past sessions and anything with attendance/notes are kept as history.
 */
export async function clearFutureSessions(where: Prisma.SessionInstanceWhereInput, db: Tx = prisma) {
  const res = await db.sessionInstance.deleteMany({
    where: {
      ...where,
      status: "SCHEDULED",
      startsAt: { gt: new Date() },
      attendances: { none: {} },
      progressNote: null,
    },
  });
  return res.count;
}

export type Conflict = { who: "teacher" | "student"; name: string; label: string };

/**
 * Weekly double-booking check for a proposed slot, for both the teacher and the student.
 * Compares against every active slot on their other active enrollments.
 */
export async function findSlotConflicts(opts: {
  teacherId: string;
  studentId: string;
  weekday: Weekday;
  startTime: string;
  durationMinutes: number;
  ignoreSlotId?: number;
}): Promise<Conflict[]> {
  const slots = await prisma.sessionSlot.findMany({
    where: {
      active: true,
      weekday: opts.weekday,
      id: opts.ignoreSlotId ? { not: opts.ignoreSlotId } : undefined,
      enrollment: {
        status: "ACTIVE",
        OR: [{ teacherId: opts.teacherId }, { studentId: opts.studentId }],
      },
      OR: [{ validUntil: null }, { validUntil: { gte: new Date(dateKey(new Date(), TZ)) } }],
    },
    include: {
      enrollment: {
        include: { subject: true, teacher: { include: { user: true } }, student: { include: { user: true } } },
      },
    },
  });

  return slots
    .filter((s) => slotsOverlap(s, opts))
    .map((s) => {
      const end = fromMinutes(toMinutes(s.startTime) + s.durationMinutes);
      const e = s.enrollment;
      const isTeacher = e.teacherId === opts.teacherId;
      return {
        who: isTeacher ? ("teacher" as const) : ("student" as const),
        name: isTeacher ? e.teacher.user.firstName : e.student.user.firstName,
        label: `${e.subject.name} with ${isTeacher ? e.student.user.firstName : e.teacher.user.firstName}, ${s.startTime}–${end}`,
      };
    });
}

/** Minutes per week booked for each teacher from active slots. */
export async function weeklyLoadByTeacher() {
  const slots = await prisma.sessionSlot.findMany({
    where: {
      active: true,
      enrollment: { status: "ACTIVE" },
      OR: [{ validUntil: null }, { validUntil: { gte: new Date(dateKey(new Date(), TZ)) } }],
    },
    select: { durationMinutes: true, enrollment: { select: { teacherId: true } } },
  });
  const load = new Map<string, number>();
  for (const s of slots) load.set(s.enrollment.teacherId, (load.get(s.enrollment.teacherId) ?? 0) + s.durationMinutes);
  return load;
}
