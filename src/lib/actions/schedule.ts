"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/roles";
import { assertRole } from "@/lib/auth";
import { clearFutureSessions, findSlotConflicts, generateForSlot, type Conflict } from "@/lib/sessions";
import { TZ, dateKey, isHHMM, meetingRoomName, zonedToUtc } from "@/lib/schedule";
import { parseMeetingLink } from "@/lib/meeting";

type Result<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; conflicts?: Conflict[]; fieldErrors?: Record<string, string> };

const WEEKDAY = z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);

const SlotInput = z.object({
  weekday: WEEKDAY,
  startTime: z.string().refine(isHHMM, "Use HH:MM"),
  durationMinutes: z.number().int().min(15).max(240),
});
export type SlotInputT = z.infer<typeof SlotInput>;

const EnrollmentInput = z.object({
  studentId: z.string().min(1, "Choose a student"),
  subjectId: z.number({ invalid_type_error: "Choose a subject" }).int(),
  teacherId: z.string().min(1, "Choose a teacher"),
  curriculum: z.enum(["CAMBRIDGE", "EDEXCEL", "CBE", "IB"]).optional(),
  levelId: z.number().int().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slots: z.array(SlotInput).max(7),
  meetingUrl: z.string().trim().optional(),
  force: z.boolean().default(false),
});
export type EnrollmentInputT = z.input<typeof EnrollmentInput>;

const refresh = (enrollmentId?: number) => {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/parent", "layout");
  if (enrollmentId) revalidatePath(`/admin/enrollments/${enrollmentId}`);
};

/** Slots in the same request must not clash with each other either. */
function internalClashes(slots: SlotInputT[]) {
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (a.weekday !== b.weekday) continue;
      const [a0, b0] = [a, b].map((s) => Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3)));
      if (a0 < b0 + b.durationMinutes && b0 < a0 + a.durationMinutes) return true;
    }
  return false;
}

export async function createEnrollment(input: EnrollmentInputT): Promise<Result<{ id: number; sessions: number }>> {
  await assertRole("admin");
  const parsed = EnrollmentInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please complete the highlighted fields.",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])),
    };
  }
  const d = parsed.data;

  const [teaches, existing, student] = await Promise.all([
    prisma.teacherSubject.findUnique({ where: { teacherId_subjectId: { teacherId: d.teacherId, subjectId: d.subjectId } } }),
    prisma.enrollment.findUnique({
      where: { teacherId_studentId_subjectId: { teacherId: d.teacherId, studentId: d.studentId, subjectId: d.subjectId } },
    }),
    prisma.student.findUnique({ where: { id: d.studentId } }),
  ]);
  if (!student) return { ok: false, error: "That student no longer exists." };
  if (!teaches) return { ok: false, error: "This teacher isn't set up to teach that subject. Add it on their profile first." };
  if (existing && existing.status !== "ENDED") {
    return { ok: false, error: "This student already has this subject with this teacher." };
  }
  if (internalClashes(d.slots)) return { ok: false, error: "Two of the weekly slots overlap each other." };
  const link = d.meetingUrl ? parseMeetingLink(d.meetingUrl) : null;
  if (d.meetingUrl && !link) {
    return { ok: false, error: "That doesn’t look like a Google Meet link.", fieldErrors: { meetingUrl: "Paste a link like https://meet.google.com/abc-defg-hij" } };
  }

  if (!d.force) {
    const conflicts = (
      await Promise.all(d.slots.map((s) => findSlotConflicts({ teacherId: d.teacherId, studentId: d.studentId, ...s })))
    ).flat();
    if (conflicts.length) return { ok: false, error: "These times clash with existing lessons.", conflicts };
  }

  const startDate = new Date(d.startDate ?? dateKey(new Date()));
  const enrollment = await prisma.$transaction(async (tx) => {
    if (link) await tx.student.update({ where: { id: d.studentId }, data: { meetingUrl: link.url } });
    const data = {
      curriculum: d.curriculum ?? student.curriculum,
      levelId: d.levelId ?? student.levelId,
      status: "ACTIVE" as const,
      startDate,
      endDate: null,
    };
    const e = existing
      ? await tx.enrollment.update({ where: { id: existing.id }, data })
      : await tx.enrollment.create({
          data: { ...data, teacherId: d.teacherId, studentId: d.studentId, subjectId: d.subjectId },
        });
    if (d.slots.length) {
      await tx.sessionSlot.createMany({
        data: d.slots.map((s) => ({ ...s, enrollmentId: e.id, timezone: TZ, validFrom: startDate })),
      });
    }
    return e;
  });

  const slots = await prisma.sessionSlot.findMany({ where: { enrollmentId: enrollment.id, active: true } });
  let sessions = 0;
  for (const s of slots) sessions += await generateForSlot(s.id);

  refresh(enrollment.id);
  return {
    ok: true,
    data: { id: enrollment.id, sessions },
    message: sessions ? `Subject added · ${sessions} lessons scheduled` : "Subject added",
  };
}

export async function addSlot(enrollmentId: number, input: SlotInputT, force = false): Promise<Result> {
  await assertRole("admin");
  const s = SlotInput.safeParse(input);
  if (!s.success) return { ok: false, error: "Check the day, time and length." };
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { ok: false, error: "Subject not found." };
  if (e.status !== "ACTIVE") return { ok: false, error: "Reactivate the enrollment before adding times." };

  if (!force) {
    const conflicts = await findSlotConflicts({ teacherId: e.teacherId, studentId: e.studentId, ...s.data });
    if (conflicts.length) return { ok: false, error: "That time clashes with an existing lesson.", conflicts };
  }
  const slot = await prisma.sessionSlot.create({
    data: { ...s.data, enrollmentId, timezone: TZ, validFrom: new Date(dateKey(new Date())) },
  });
  const n = await generateForSlot(slot.id);
  refresh(enrollmentId);
  return { ok: true, message: `Weekly time added · ${n} sessions scheduled` };
}

const OneOffInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  startTime: z.string().refine(isHHMM, "Use HH:MM"),
  durationMinutes: z.number().int().min(15).max(240),
});
export type OneOffInputT = z.infer<typeof OneOffInput>;

/**
 * A single lesson on one date — no weekly time, nothing repeats.
 * Checked against the teacher's and the student's real lessons that day; "force" books it anyway.
 */
export async function addOneOffSession(enrollmentId: number, input: OneOffInputT, force = false): Promise<Result> {
  await assertRole("admin");
  const p = OneOffInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose a date, start time and length." };
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId }, include: { subject: true } });
  if (!e) return { ok: false, error: "Subject not found." };
  if (e.status !== "ACTIVE") return { ok: false, error: "Reactivate the subject before adding a lesson." };

  const [y, m, d] = p.data.date.split("-").map(Number);
  const startsAt = zonedToUtc(y, m, d, p.data.startTime);
  if (startsAt.getTime() < Date.now()) return { ok: false, error: "Pick a time in the future." };
  const endsAt = new Date(startsAt.getTime() + p.data.durationMinutes * 60_000);

  if (!force) {
    const clashes = await prisma.sessionInstance.findMany({
      where: {
        status: "SCHEDULED",
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        enrollment: { OR: [{ teacherId: e.teacherId }, { studentId: e.studentId }] },
      },
      include: { enrollment: { include: { subject: true, teacher: { include: { user: true } }, student: { include: { user: true } } } } },
    });
    if (clashes.length) {
      const t = (x: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(x);
      const conflicts: Conflict[] = clashes.map((c) => {
        const who = c.enrollment.teacherId === e.teacherId ? "teacher" : "student";
        const person = who === "teacher" ? c.enrollment.teacher.user : c.enrollment.student.user;
        return { who, name: `${person.firstName} ${person.lastName}`, label: `${c.enrollment.subject.name} ${t(c.startsAt)}–${t(c.endsAt)}` };
      });
      return { ok: false, error: "That time clashes with another lesson.", conflicts };
    }
  }

  await prisma.sessionInstance.create({
    data: { enrollmentId, startsAt, endsAt, meetingRoom: meetingRoomName(e.subject.code) },
  });
  refresh(enrollmentId);
  const when = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(startsAt);
  return { ok: true, message: `One-off lesson added · ${when} at ${p.data.startTime}` };
}

export async function removeSlot(slotId: number): Promise<Result> {
  await assertRole("admin");
  const slot = await prisma.sessionSlot.findUnique({ where: { id: slotId } });
  if (!slot) return { ok: false, error: "Already removed." };
  // Keep the slot as history; stop it from today and drop its future sessions.
  const n = await prisma.$transaction(async (tx) => {
    await tx.sessionSlot.update({
      where: { id: slotId },
      data: { active: false, validUntil: new Date(dateKey(new Date())) },
    });
    return clearFutureSessions({ slotId }, tx);
  });
  refresh(slot.enrollmentId);
  return { ok: true, message: n ? `Weekly time removed · ${n} upcoming sessions cancelled` : "Weekly time removed" };
}

export async function setEnrollmentStatus(id: number, status: "ACTIVE" | "PAUSED" | "ENDED"): Promise<Result> {
  await assertRole("admin");
  const e = await prisma.enrollment.findUnique({ where: { id }, include: { slots: { where: { active: true } } } });
  if (!e) return { ok: false, error: "Subject not found." };

  if (status === "ACTIVE") {
    await prisma.enrollment.update({ where: { id }, data: { status, endDate: null } });
    let n = 0;
    for (const s of e.slots) n += await generateForSlot(s.id);
    refresh(id);
    return { ok: true, message: n ? `Resumed · ${n} sessions scheduled` : "Resumed" };
  }

  const today = new Date(dateKey(new Date()));
  const n = await prisma.$transaction(async (tx) => {
    await tx.enrollment.update({ where: { id }, data: { status, endDate: status === "ENDED" ? today : null } });
    if (status === "ENDED") {
      await tx.sessionSlot.updateMany({ where: { enrollmentId: id, active: true }, data: { active: false, validUntil: today } });
    }
    return clearFutureSessions({ enrollmentId: id }, tx);
  });
  refresh(id);
  const verb = status === "PAUSED" ? "Paused" : "Ended";
  return { ok: true, message: n ? `${verb} · ${n} upcoming sessions removed` : verb };
}

const RescheduleInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().refine(isHHMM),
  durationMinutes: z.number().int().min(15).max(240),
});

export async function rescheduleSession(sessionId: number, input: z.infer<typeof RescheduleInput>): Promise<Result> {
  const me = await assertRole("admin", "teacher");
  const p = RescheduleInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose a date and time." };
  const s = await prisma.sessionInstance.findUnique({
    where: { id: sessionId },
    include: { enrollment: { include: { subject: true } }, rescheduledTo: true },
  });
  if (!s || (!hasAdminAccess(me) && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Session not found." };
  if (s.status !== "SCHEDULED") return { ok: false, error: "Only upcoming scheduled sessions can be moved." };

  const [y, m, d] = p.data.date.split("-").map(Number);
  const startsAt = zonedToUtc(y, m, d, p.data.startTime);
  if (startsAt.getTime() < Date.now()) return { ok: false, error: "Pick a time in the future." };
  const endsAt = new Date(startsAt.getTime() + p.data.durationMinutes * 60_000);

  // Hard clash check against real sessions for both people.
  const clash = await prisma.sessionInstance.findFirst({
    where: {
      id: { not: s.id },
      status: "SCHEDULED",
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      enrollment: { OR: [{ teacherId: s.enrollment.teacherId }, { studentId: s.enrollment.studentId }] },
    },
    include: { enrollment: { include: { subject: true } } },
  });
  if (clash) return { ok: false, error: `That clashes with ${clash.enrollment.subject.name} at the same time.` };

  await prisma.$transaction([
    prisma.sessionInstance.update({ where: { id: s.id }, data: { status: "RESCHEDULED" } }),
    prisma.sessionInstance.create({
      data: {
        enrollmentId: s.enrollmentId,
        startsAt,
        endsAt,
        rescheduledFromId: s.id,
        meetingRoom: meetingRoomName(s.enrollment.subject.code),
      },
    }),
  ]);
  refresh(s.enrollmentId);
  return { ok: true, message: "Session moved" };
}

export async function cancelSession(sessionId: number, reason: string): Promise<Result> {
  const me = await assertRole("admin", "teacher");
  const s = await prisma.sessionInstance.findUnique({ where: { id: sessionId }, include: { enrollment: true } });
  if (!s || (!hasAdminAccess(me) && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Session not found." };
  if (s.status !== "SCHEDULED") return { ok: false, error: "Only scheduled sessions can be cancelled." };
  await prisma.sessionInstance.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", cancelReason: reason.trim() || null },
  });
  refresh(s.enrollmentId);
  return { ok: true, message: "Session cancelled" };
}

/** Set or clear a student's one online-class link (e.g. Google Meet), used for all their subjects and teachers. */
export async function setStudentMeetingLink(studentId: string, raw: string | null): Promise<Result> {
  await assertRole("admin");
  const link = raw ? parseMeetingLink(raw) : null;
  if (raw && !link) return { ok: false, error: "Paste a Google Meet link like https://meet.google.com/abc-defg-hij" };
  const st = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!st) return { ok: false, error: "Student not found." };
  await prisma.student.update({ where: { id: studentId }, data: { meetingUrl: link?.url ?? null } });
  refresh();
  revalidatePath(`/admin/people/${studentId}`);
  return { ok: true, message: link ? `${link.provider} link saved for all subjects` : "Link removed" };
}

/* ------------------------------------------------------------------ swap one lesson for another */

export type SwapOption = { subjectId: number; subject: string; current: boolean; teachers: { id: string; name: string; busy: string | null; teachesIt: boolean }[] };

/**
 * For the swap panel: every subject, with the teachers who could take this lesson's slot.
 * Each teacher is flagged if they already have a lesson at that time.
 */
export async function swapOptions(sessionId: number): Promise<{ ok: true; options: SwapOption[]; current: { subject: string; teacher: string } } | { ok: false; error: string }> {
  await assertRole("admin");
  const s = await prisma.sessionInstance.findUnique({
    where: { id: sessionId },
    include: { enrollment: { include: { subject: true, teacher: { include: { user: true } } } } },
  });
  if (!s || s.status !== "SCHEDULED") return { ok: false, error: "Only upcoming scheduled lessons can be swapped." };

  const [subjects, teachers, busy] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      where: { user: { active: true } },
      include: { user: { select: { firstName: true, lastName: true } }, subjects: { select: { subjectId: true } } },
      orderBy: { user: { firstName: "asc" } },
    }),
    prisma.sessionInstance.findMany({
      where: { id: { not: s.id }, status: "SCHEDULED", startsAt: { lt: s.endsAt }, endsAt: { gt: s.startsAt } },
      include: { enrollment: { include: { subject: true } } },
    }),
  ]);
  const busyFor = (teacherId: string) => {
    const b = busy.find((x) => x.enrollment.teacherId === teacherId);
    return b ? `Teaching ${b.enrollment.subject.name} then` : null;
  };
  const options: SwapOption[] = subjects.map((sub) => {
    const list = teachers
      .map((t) => ({
        id: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`,
        busy: busyFor(t.id),
        teachesIt: t.subjects.some((x) => x.subjectId === sub.id),
      }))
      // Teachers who teach the subject first, then free before busy.
      .sort((a, b) => Number(b.teachesIt) - Number(a.teachesIt) || Number(!!a.busy) - Number(!!b.busy) || a.name.localeCompare(b.name));
    return { subjectId: sub.id, subject: sub.name, current: sub.id === s.enrollment.subjectId, teachers: list };
  });
  return {
    ok: true,
    options,
    current: { subject: s.enrollment.subject.name, teacher: `${s.enrollment.teacher.user.firstName} ${s.enrollment.teacher.user.lastName}` },
  };
}

/**
 * Replace one lesson with a different subject and/or teacher, at the same time, for that day only.
 * The original is marked cancelled ("Swapped for …") and linked to its replacement; the weekly timetable is untouched,
 * so the usual lesson returns next week. The replacement is a normal lesson: join link, attendance, record, pay.
 */
export async function swapSession(sessionId: number, input: { subjectId: number; teacherId: string }, force = false): Promise<Result> {
  await assertRole("admin");
  const s = await prisma.sessionInstance.findUnique({
    where: { id: sessionId },
    include: { enrollment: { include: { subject: true } } },
  });
  if (!s || s.status !== "SCHEDULED") return { ok: false, error: "Only upcoming scheduled lessons can be swapped." };
  if (+s.endsAt < Date.now()) return { ok: false, error: "This lesson has already finished." };
  if (input.subjectId === s.enrollment.subjectId && input.teacherId === s.enrollment.teacherId) return { ok: false, error: "Choose a different subject or teacher." };

  const [subject, teacher] = await Promise.all([
    prisma.subject.findUnique({ where: { id: input.subjectId } }),
    prisma.teacher.findUnique({ where: { id: input.teacherId }, include: { user: true } }),
  ]);
  if (!subject || !teacher || !teacher.user.active) return { ok: false, error: "Choose a subject and an active teacher." };

  if (!force) {
    const clash = await prisma.sessionInstance.findMany({
      where: { id: { not: s.id }, status: "SCHEDULED", startsAt: { lt: s.endsAt }, endsAt: { gt: s.startsAt }, enrollment: { teacherId: teacher.id } },
      include: { enrollment: { include: { subject: true, student: { include: { user: true } } } } },
    });
    if (clash.length) {
      const t = (x: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(x);
      return {
        ok: false,
        error: `${teacher.user.firstName} already has a lesson then.`,
        conflicts: clash.map((c) => ({
          who: "teacher" as const,
          name: `${teacher.user.firstName} ${teacher.user.lastName}`,
          label: `${c.enrollment.subject.name} with ${c.enrollment.student.user.firstName} ${t(c.startsAt)}–${t(c.endsAt)}`,
        })),
      };
    }
  }

  // The lesson belongs to the student's enrollment for that subject and teacher. If they don't have one, a record is
  // kept for this lesson only — marked ended, so it never appears as one of the student's regular subjects.
  let target = await prisma.enrollment.findFirst({
    where: { studentId: s.enrollment.studentId, teacherId: teacher.id, subjectId: subject.id },
    orderBy: { status: "asc" }, // ACTIVE before PAUSED before ENDED
  });
  if (!target) {
    const day = new Date(dateKey(s.startsAt));
    target = await prisma.enrollment.create({
      data: {
        studentId: s.enrollment.studentId,
        teacherId: teacher.id,
        subjectId: subject.id,
        curriculum: s.enrollment.curriculum,
        levelId: s.enrollment.levelId,
        status: "ENDED",
        startDate: day,
        endDate: day,
      },
    });
  }

  const reason = `Swapped for ${subject.name} with ${teacher.user.firstName} ${teacher.user.lastName}`;
  await prisma.$transaction([
    prisma.sessionInstance.update({ where: { id: s.id }, data: { status: "CANCELLED", cancelReason: reason } }),
    prisma.sessionInstance.create({
      data: {
        enrollmentId: target.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        location: s.location,
        rescheduledFromId: s.id,
        meetingRoom: meetingRoomName(subject.code),
      },
    }),
  ]);
  refresh(s.enrollmentId);
  refresh(target.id);
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/parent", "layout");
  return { ok: true, message: `${s.enrollment.subject.name} swapped for ${subject.name} with ${teacher.user.firstName} for this lesson only` };
}

/** Put a swapped lesson back as it was (only if the replacement hasn't been taught or recorded). */
export async function undoSwap(originalId: number): Promise<Result> {
  await assertRole("admin");
  const s = await prisma.sessionInstance.findUnique({
    where: { id: originalId },
    include: { rescheduledTo: { include: { attendances: true, progressNote: true } }, enrollment: true },
  });
  const r = s?.rescheduledTo;
  if (!s || s.status !== "CANCELLED" || !r || r.enrollmentId === s.enrollmentId) return { ok: false, error: "This lesson wasn’t swapped." };
  if (r.status !== "SCHEDULED" || r.attendances.length || r.progressNote) return { ok: false, error: "The replacement lesson has already started, so it can’t be undone." };
  await prisma.$transaction([
    prisma.sessionInstance.delete({ where: { id: r.id } }),
    prisma.sessionInstance.update({ where: { id: s.id }, data: { status: "SCHEDULED", cancelReason: null } }),
  ]);
  // If the swap created a record just for that lesson and nothing else uses it, remove it too.
  const leftover = await prisma.enrollment.findUnique({
    where: { id: r.enrollmentId },
    include: { _count: { select: { sessions: true, slots: true, resources: true, submissions: true, workComments: true, invoiceLines: true, weeklyReports: true } } },
  });
  if (leftover && leftover.status === "ENDED" && Object.values(leftover._count).every((n) => n === 0)) {
    await prisma.enrollment.delete({ where: { id: leftover.id } }).catch(() => undefined);
  }
  refresh(s.enrollmentId);
  refresh(r.enrollmentId);
  revalidatePath("/teacher", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/parent", "layout");
  return { ok: true, message: "Swap undone — the original lesson is back" };
}
