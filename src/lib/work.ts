import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import type { CurrentUser } from "./auth";
import { hasAdminAccess } from "./roles";
import { dateKey, dbDateKey } from "./schedule";

/**
 * Module 4 access rules — documents, worksheets, submissions and comment threads.
 *
 * A resource reaches students through their enrollments (one student × subject × teacher):
 *  - `enrollmentId` set → only that enrollment;
 *  - otherwise everyone taking `subjectId`, narrowed by `levelId` (if set) and `teacherId` (if set).
 * Threads and submissions belong to one enrollment and are seen by that student, their parents,
 * their teacher and the office.
 */

export type EnrollmentCtx = {
  id: number;
  studentId: string;
  teacherId: string;
  subjectId: number;
  levelId: number | null;
};

type Audience = {
  enrollmentId: number | null;
  subjectId: number;
  levelId: number | null;
  teacherId: string | null;
};

const ctxSelect = {
  id: true,
  studentId: true,
  teacherId: true,
  subjectId: true,
  levelId: true,
  student: { select: { levelId: true } },
} satisfies Prisma.EnrollmentSelect;

const toCtx = (e: Prisma.EnrollmentGetPayload<{ select: typeof ctxSelect }>): EnrollmentCtx => ({
  id: e.id,
  studentId: e.studentId,
  teacherId: e.teacherId,
  subjectId: e.subjectId,
  // An enrollment's own level wins; otherwise the student's current level.
  levelId: e.levelId ?? e.student.levelId,
});

/** Enrollments that are still running (paused ones keep their work visible). */
const LIVE = {
  status: { in: ["ACTIVE", "PAUSED"] },
} satisfies Prisma.EnrollmentWhereInput;

export async function enrollmentsWhere(where: Prisma.EnrollmentWhereInput): Promise<EnrollmentCtx[]> {
  return (
    await prisma.enrollment.findMany({
      where: { ...LIVE, ...where },
      select: ctxSelect,
    })
  ).map(toCtx);
}

export const studentEnrollments = (studentId: string) => enrollmentsWhere({ studentId });
export const teacherEnrollments = (teacherId: string) => enrollmentsWhere({ teacherId });
export const parentEnrollments = (parentId: string) => enrollmentsWhere({ student: { guardians: { some: { parentId } } } });

export function resourceMatches(r: Audience, e: EnrollmentCtx): boolean {
  if (r.enrollmentId) return r.enrollmentId === e.id;
  return r.subjectId === e.subjectId && (!r.levelId || r.levelId === e.levelId) && (!r.teacherId || r.teacherId === e.teacherId);
}

/** Prisma filter for resources reaching any of these enrollments. */
export function resourceWhereFor(enrollments: EnrollmentCtx[]): Prisma.ResourceWhereInput {
  if (!enrollments.length) return { id: -1 };
  return {
    OR: enrollments.map((e) => ({
      OR: [
        { enrollmentId: e.id },
        {
          enrollmentId: null,
          subjectId: e.subjectId,
          AND: [
            {
              OR: [{ levelId: null }, ...(e.levelId ? [{ levelId: e.levelId }] : [])],
            },
            { OR: [{ teacherId: null }, { teacherId: e.teacherId }] },
          ],
        },
      ],
    })),
  };
}

/** Teachers see what reaches their students plus anything they uploaded. */
export async function teacherResourceWhere(teacherId: string): Promise<Prisma.ResourceWhereInput> {
  const mine = await teacherEnrollments(teacherId);
  return {
    OR: [{ uploadedById: teacherId }, { teacherId }, resourceWhereFor(mine)],
  };
}

/** Live enrollments a resource reaches (the recipients list). */
export async function recipientsOf(r: Audience): Promise<EnrollmentCtx[]> {
  const candidates = await enrollmentsWhere(r.enrollmentId ? { id: r.enrollmentId } : { subjectId: r.subjectId });
  return candidates.filter((e) => resourceMatches(r, e));
}

/** Can this person see the thread / submissions of an enrollment? */
export async function canSeeEnrollmentWork(user: CurrentUser, enrollmentId: number): Promise<boolean> {
  if (hasAdminAccess(user)) return true;
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      studentId: true,
      teacherId: true,
      student: {
        select: {
          guardians: {
            where: { parentId: user.id },
            select: { parentId: true },
          },
        },
      },
    },
  });
  if (!e) return false;
  return e.studentId === user.id || e.teacherId === user.id || e.student.guardians.length > 0;
}

/** Enrollment contexts through which this person sees work, by role. */
export async function enrollmentsForViewer(user: CurrentUser): Promise<EnrollmentCtx[]> {
  if (user.role === "STUDENT") return studentEnrollments(user.id);
  if (user.role === "PARENT") return parentEnrollments(user.id);
  if (user.role === "TEACHER") return teacherEnrollments(user.id);
  return [];
}

export async function canSeeResource(user: CurrentUser, r: Audience & { uploadedById: string | null }): Promise<boolean> {
  if (hasAdminAccess(user) || r.uploadedById === user.id || (r.teacherId && r.teacherId === user.id)) return true;
  return (await enrollmentsForViewer(user)).some((e) => resourceMatches(r, e));
}

/** Who may open a stored file. */
export async function canOpenFile(user: CurrentUser, file: { id: string; purpose: string; ownerId: string | null }): Promise<boolean> {
  if (file.ownerId === user.id || hasAdminAccess(user)) return true;
  if (file.purpose === "avatar") return true; // profile photos: anyone signed in
  if (file.purpose === "resource") {
    const resources = await prisma.resource.findMany({
      where: { fileId: file.id },
      select: {
        enrollmentId: true,
        subjectId: true,
        levelId: true,
        teacherId: true,
        uploadedById: true,
      },
    });
    for (const r of resources) if (await canSeeResource(user, r)) return true;
    return false;
  }
  if (file.purpose === "submission") {
    const links = await prisma.submissionFile.findMany({
      where: { fileId: file.id },
      select: { submission: { select: { enrollmentId: true } } },
    });
    for (const l of links) if (await canSeeEnrollmentWork(user, l.submission.enrollmentId)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ status helpers */

export type WorkState = "todo" | "overdue" | "submitted" | "reviewed";

export function workState(dueDate: Date | null, submission: { status: "SUBMITTED" | "REVIEWED" } | null | undefined, today = new Date()): WorkState {
  if (submission?.status === "REVIEWED") return "reviewed";
  if (submission) return "submitted";
  if (dueDate && dbDateKey(dueDate) < dateKey(today)) return "overdue"; // due dates are Nairobi calendar days
  return "todo";
}

export const WORK_STATE_LABEL: Record<WorkState, string> = {
  todo: "To do",
  overdue: "Overdue",
  submitted: "Turned in",
  reviewed: "Marked",
};

/* ------------------------------------------------------------------ file rules */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB per request

export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "Image",
  "image/png": "Image",
  "image/webp": "Image",
  "image/heic": "Image",
  "image/heif": "Image",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-powerpoint": "PowerPoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "text/plain": "Text",
};

/** Browsers sometimes send an empty or generic type; fall back to the extension. */
export function mimeFromName(name: string, given: string): string {
  if (given && given !== "application/octet-stream") return given;
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return (
    {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
    }[ext] ?? given
  );
}
