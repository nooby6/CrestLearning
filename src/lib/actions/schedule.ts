"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
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
    const data = {
      ...(link && { meetingUrl: link.url }),
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
    message: sessions ? `Enrolled · ${sessions} sessions scheduled` : "Enrolled",
  };
}

export async function addSlot(enrollmentId: number, input: SlotInputT, force = false): Promise<Result> {
  await assertRole("admin");
  const s = SlotInput.safeParse(input);
  if (!s.success) return { ok: false, error: "Check the day, time and length." };
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { ok: false, error: "Enrollment not found." };
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
  if (!e) return { ok: false, error: "Enrollment not found." };

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
  if (!s || (me.role === "TEACHER" && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Session not found." };
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
  if (!s || (me.role === "TEACHER" && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Session not found." };
  if (s.status !== "SCHEDULED") return { ok: false, error: "Only scheduled sessions can be cancelled." };
  await prisma.sessionInstance.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", cancelReason: reason.trim() || null },
  });
  refresh(s.enrollmentId);
  return { ok: true, message: "Session cancelled" };
}

/** Set or clear the standing online-class link (e.g. Google Meet) for an enrollment. */
export async function setMeetingLink(enrollmentId: number, raw: string | null): Promise<Result> {
  await assertRole("admin");
  const link = raw ? parseMeetingLink(raw) : null;
  if (raw && !link) return { ok: false, error: "Paste a Google Meet link like https://meet.google.com/abc-defg-hij" };
  const e = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
  if (!e) return { ok: false, error: "Enrollment not found." };
  await prisma.enrollment.update({ where: { id: enrollmentId }, data: { meetingUrl: link?.url ?? null } });
  refresh(enrollmentId);
  return { ok: true, message: link ? `${link.provider} link saved` : "Link removed" };
}
