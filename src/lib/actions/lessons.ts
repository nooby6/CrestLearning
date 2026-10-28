"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/roles";
import { assertRole } from "@/lib/auth";
import { mondayOf, dateKey } from "@/lib/schedule";

type Result = { ok: true; message?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const refresh = () => {
  for (const p of ["/teacher", "/admin", "/parent", "/student"]) revalidatePath(p, "layout");
};

/** Teacher (own sessions) or admin. */
async function loadSessionFor(sessionId: number) {
  const me = await assertRole("teacher", "admin");
  const s = await prisma.sessionInstance.findUnique({
    where: { id: sessionId },
    include: { enrollment: true, progressNote: true, attendances: true },
  });
  if (!s || (!hasAdminAccess(me) && s.enrollment.teacherId !== me.id)) throw new Error("Session not found.");
  return { me, s };
}

const RecordInput = z.object({
  topicsCovered: z.string().trim().min(3, "Describe what was covered").max(2000),
  homework: z.string().trim().max(1000).optional(),
  homeworkDue: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  comment: z.string().trim().max(1000).optional(),
  /** The teacher confirms the student's attendance with every record. */
  studentAttendance: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"], { required_error: "Confirm the student’s attendance" }),
});
export type RecordInputT = z.input<typeof RecordInput>;

/**
 * The lesson record — required after every session the teacher taught.
 * Saving it also marks the session as held.
 */
export async function saveLessonRecord(sessionId: number, input: RecordInputT): Promise<Result> {
  let ctx;
  try {
    ctx = await loadSessionFor(sessionId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const { me, s } = ctx;
  if (s.status === "CANCELLED" || s.status === "RESCHEDULED") return { ok: false, error: "This session didn’t take place." };
  if (+s.startsAt > Date.now()) return { ok: false, error: "You can record a lesson once it has started." };

  const p = RecordInput.safeParse(input);
  if (!p.success) {
    return {
      ok: false,
      error: p.error.issues[0]?.path[0] === "studentAttendance" ? "Confirm the student’s attendance." : "Please describe what was covered.",
      fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])),
    };
  }
  const d = p.data;
  const data = {
    topicsCovered: d.topicsCovered,
    homework: d.homework || null,
    homeworkDue: d.homeworkDue ? new Date(d.homeworkDue) : null,
    comment: d.comment || null,
  };

  const studentId = s.enrollment.studentId;
  const auto = s.attendances.find((a) => a.userId === studentId);
  // Keep the automatic record when the teacher agrees with it; otherwise store the teacher's correction.
  const studentAttendance =
    auto && auto.status === d.studentAttendance
      ? []
      : [
          prisma.attendance.upsert({
            where: { sessionId_userId: { sessionId, userId: studentId } },
            create: { sessionId, userId: studentId, role: "STUDENT" as const, status: d.studentAttendance, source: "MANUAL" as const, overriddenById: me.id },
            update: { status: d.studentAttendance, source: "MANUAL", overriddenById: me.id },
          }),
        ];

  await prisma.$transaction([
    ...studentAttendance,
    prisma.progressNote.upsert({
      where: { sessionId },
      create: { sessionId, authorId: me.id, ...data },
      update: data,
    }),
    // A recorded lesson was held, even if the video join wasn't captured (e.g. taught in person).
    prisma.sessionInstance.update({
      where: { id: sessionId },
      data: { status: s.status === "SCHEDULED" || s.status === "MISSED" ? "HELD" : s.status },
    }),
    // Ensure the teacher's attendance exists for held sessions.
    prisma.attendance.upsert({
      where: { sessionId_userId: { sessionId, userId: s.enrollment.teacherId } },
      create: { sessionId, userId: s.enrollment.teacherId, role: "TEACHER", status: "PRESENT", source: "MANUAL", overriddenById: me.id },
      update: {},
    }),
  ]);
  refresh();
  return { ok: true, message: s.progressNote ? "Lesson record updated" : "Lesson record saved" };
}

const OverrideInput = z.object({
  userId: z.string().min(1),
  status: z.enum(["PRESENT", "LATE", "ABSENT", "EXCUSED"]),
  reason: z.string().trim().max(300).optional(),
});

/** Manual attendance correction for the student or the teacher of a session. */
export async function overrideAttendance(sessionId: number, input: z.input<typeof OverrideInput>): Promise<Result> {
  let ctx;
  try {
    ctx = await loadSessionFor(sessionId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  const { me, s } = ctx;
  const p = OverrideInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose a status." };
  const { userId, status, reason } = p.data;
  const role = userId === s.enrollment.teacherId ? "TEACHER" : userId === s.enrollment.studentId ? "STUDENT" : null;
  if (!role) return { ok: false, error: "That person isn’t part of this session." };
  if (role === "TEACHER" && !hasAdminAccess(me)) return { ok: false, error: "Only the office can change a teacher’s attendance." };
  if (+s.startsAt > Date.now()) return { ok: false, error: "Attendance can be set once the session has started." };

  await prisma.attendance.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, role, status, source: "MANUAL", overriddenById: me.id, overrideReason: reason || null },
    update: { status, source: "MANUAL", overriddenById: me.id, overrideReason: reason || null },
  });

  // Teacher attendance decides whether the session counts as held.
  if (role === "TEACHER" && s.status !== "CANCELLED" && s.status !== "RESCHEDULED" && +s.endsAt < Date.now()) {
    await prisma.sessionInstance.update({
      where: { id: sessionId },
      data: { status: status === "PRESENT" || status === "LATE" ? "HELD" : "MISSED" },
    });
  }
  refresh();
  return { ok: true, message: "Attendance updated" };
}

const ReportInput = z.object({
  enrollmentId: z.number().int(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().trim().min(20, "Write at least a couple of sentences").max(3000),
  strengths: z.string().trim().max(1500).optional(),
  nextSteps: z.string().trim().max(1500).optional(),
  effort: z.number().int().min(1).max(5).optional(),
});
export type ReportInputT = z.input<typeof ReportInput>;

/** The teacher's weekly report for one enrollment. Editable until the end of the following week. */
export async function saveWeeklyReport(input: ReportInputT): Promise<Result> {
  const me = await assertRole("teacher", "admin");
  const p = ReportInput.safeParse(input);
  if (!p.success) {
    return {
      ok: false,
      error: "Please complete the report.",
      fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])),
    };
  }
  const d = p.data;
  if (mondayOf(d.weekStart) !== d.weekStart) return { ok: false, error: "Invalid week." };
  const thisWeek = mondayOf(dateKey(new Date()));
  if (d.weekStart > thisWeek) return { ok: false, error: "You can’t report on a future week." };

  const e = await prisma.enrollment.findUnique({ where: { id: d.enrollmentId } });
  if (!e || (!hasAdminAccess(me) && e.teacherId !== me.id)) return { ok: false, error: "Enrollment not found." };

  const data = { summary: d.summary, strengths: d.strengths || null, nextSteps: d.nextSteps || null, effort: d.effort ?? null };
  const weekStart = new Date(d.weekStart);
  const existing = await prisma.weeklyReport.findUnique({ where: { enrollmentId_weekStart: { enrollmentId: e.id, weekStart } } });
  await prisma.weeklyReport.upsert({
    where: { enrollmentId_weekStart: { enrollmentId: e.id, weekStart } },
    create: { enrollmentId: e.id, weekStart, authorId: me.id, ...data },
    update: data,
  });
  refresh();
  return { ok: true, message: existing ? "Report updated" : "Report submitted" };
}
