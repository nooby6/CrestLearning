import "server-only";
import type { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { fullName } from "./format";
import {
  enrollmentsWhere,
  parentEnrollments,
  resourceMatches,
  resourceWhereFor,
  studentEnrollments,
  teacherResourceWhere,
  workState,
  type EnrollmentCtx,
  type WorkState,
} from "./work";

export type Portal = "admin" | "teacher";

export const resourceInclude = {
  file: { select: { id: true, name: true, mimeType: true, sizeBytes: true } },
  subject: { select: { id: true, name: true, code: true } },
  level: { select: { id: true, name: true, curriculum: true } },
  enrollment: {
    select: {
      id: true,
      student: {
        select: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
  teacher: {
    select: { user: { select: { firstName: true, lastName: true } } },
  },
  uploadedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.ResourceInclude;

export type ResourceRow = Prisma.ResourceGetPayload<{
  include: typeof resourceInclude;
}>;

/** "Amani Mwangi only", "All of Grace’s Mathematics students · IGCSE Year 10", "Everyone taking Physics". */
export function audienceLabel(r: ResourceRow, viewerIsTeacher = false): string {
  if (r.enrollment) return `${fullName(r.enrollment.student.user)} only`;
  const level = r.level ? ` · ${r.level.name}` : "";
  if (r.teacher) return viewerIsTeacher ? `All my ${r.subject.name} students${level}` : `${r.teacher.user.firstName}’s ${r.subject.name} students${level}`;
  return `Everyone taking ${r.subject.name}${level}`;
}

/* ------------------------------------------------------------------ staff (teacher / office) */

export async function staffScope(portal: Portal, userId: string) {
  const where: Prisma.ResourceWhereInput = portal === "admin" ? {} : await teacherResourceWhere(userId);
  const enrollments = await enrollmentsWhere(portal === "admin" ? {} : { teacherId: userId });
  return { where, enrollments };
}

export async function staffResources(portal: Portal, userId: string, filter: { kind?: "DOCUMENT" | "WORKSHEET"; q?: string } = {}) {
  const { where, enrollments } = await staffScope(portal, userId);
  const resources = await prisma.resource.findMany({
    where: {
      AND: [
        where,
        filter.kind ? { kind: filter.kind } : {},
        filter.q
          ? {
              OR: [
                { title: { contains: filter.q, mode: "insensitive" } },
                {
                  subject: {
                    name: { contains: filter.q, mode: "insensitive" },
                  },
                },
              ],
            }
          : {},
      ],
    },
    include: {
      ...resourceInclude,
      submissions: { select: { status: true, enrollmentId: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return resources.map((r) => {
    const reach = enrollments.filter((e) => resourceMatches(r, e)).map((e) => e.id);
    const subs = r.submissions.filter((s) => portal === "admin" || reach.includes(s.enrollmentId));
    return {
      ...r,
      recipients: reach.length,
      submitted: subs.length,
      toMark: subs.filter((s) => s.status === "SUBMITTED").length,
    };
  });
}

/** Turned-in worksheets waiting to be marked. */
export async function submissionsToMark(portal: Portal, userId: string, take = 20) {
  return prisma.submission.findMany({
    where: {
      status: "SUBMITTED",
      ...(portal === "teacher" ? { enrollment: { teacherId: userId } } : {}),
    },
    include: {
      resource: { select: { id: true, title: true, dueDate: true } },
      student: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
      enrollment: { select: { subject: { select: { name: true } } } },
    },
    orderBy: { submittedAt: "asc" },
    take,
  });
}

/** Open requests for more worksheets. */
export async function openRequests(portal: Portal, userId: string, take = 20) {
  return prisma.workComment.findMany({
    where: {
      kind: "REQUEST",
      resolvedAt: null,
      ...(portal === "teacher" ? { enrollment: { teacherId: userId } } : {}),
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          role: true,
        },
      },
      enrollment: {
        select: {
          id: true,
          subject: { select: { name: true } },
          student: {
            select: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      },
      resource: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function staffCounts(portal: Portal, userId: string) {
  const scope = portal === "teacher" ? { enrollment: { teacherId: userId } } : {};
  const [toMark, requests] = await Promise.all([
    prisma.submission.count({ where: { status: "SUBMITTED", ...scope } }),
    prisma.workComment.count({
      where: { kind: "REQUEST", resolvedAt: null, ...scope },
    }),
  ]);
  return { toMark, requests };
}

/* ------------------------------------------------------------------ comment threads */

export const commentInclude = {
  author: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
  },
  resource: { select: { id: true, title: true } },
} satisfies Prisma.WorkCommentInclude;

export type ThreadComment = {
  id: number;
  body: string;
  kind: "COMMENT" | "REQUEST";
  createdAt: string;
  resolvedAt: string | null;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: string;
  };
  resource: { id: number; title: string } | null;
};

export async function threadFor(enrollmentId: number, resourceId?: number | null): Promise<ThreadComment[]> {
  const rows = await prisma.workComment.findMany({
    where: {
      enrollmentId,
      ...(resourceId !== undefined ? { resourceId } : {}),
    },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    kind: c.kind,
    createdAt: c.createdAt.toISOString(),
    resolvedAt: c.resolvedAt?.toISOString() ?? null,
    author: c.author,
    resource: c.resource,
  }));
}

/* ------------------------------------------------------------------ students & parents */

export type StudentWorkItem = ResourceRow & {
  enrollmentId: number;
  state: WorkState | null; // null for documents
  submission: {
    id: number;
    status: "SUBMITTED" | "REVIEWED";
    submittedAt: Date;
    mark: string | null;
  } | null;
  comments: number;
};

/** Everything assigned to a student, newest first, with their own progress. */
export async function workForStudent(studentId: string, enrollments?: EnrollmentCtx[]): Promise<StudentWorkItem[]> {
  const mine = (enrollments ?? (await studentEnrollments(studentId))).filter((e) => e.studentId === studentId);
  if (!mine.length) return [];
  const [resources, submissions, comments] = await Promise.all([
    prisma.resource.findMany({
      where: resourceWhereFor(mine),
      include: resourceInclude,
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.submission.findMany({
      where: { studentId },
      select: {
        id: true,
        resourceId: true,
        status: true,
        submittedAt: true,
        mark: true,
      },
    }),
    prisma.workComment.groupBy({
      by: ["resourceId"],
      where: {
        enrollmentId: { in: mine.map((e) => e.id) },
        resourceId: { not: null },
      },
      _count: true,
    }),
  ]);
  const subBy = new Map(submissions.map((s) => [s.resourceId, s]));
  const comBy = new Map(comments.map((c) => [c.resourceId, c._count]));
  return resources.map((r) => {
    const e = mine.find((x) => resourceMatches(r, x))!;
    const s = subBy.get(r.id) ?? null;
    return {
      ...r,
      enrollmentId: e.id,
      state: r.kind === "WORKSHEET" ? workState(r.dueDate, s) : null,
      submission: s
        ? {
            id: s.id,
            status: s.status,
            submittedAt: s.submittedAt,
            mark: s.mark,
          }
        : null,
      comments: comBy.get(r.id) ?? 0,
    };
  });
}

export async function workForParent(parentId: string) {
  const all = await parentEnrollments(parentId);
  const studentIds = [...new Set(all.map((e) => e.studentId))];
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: { user: { firstName: "asc" } },
  });
  return Promise.all(
    students.map(async (s) => ({
      student: s,
      items: await workForStudent(s.id, all),
    })),
  );
}

/** The student's enrollments, labelled — for "request a worksheet" pickers. */
export async function labelledEnrollments(where: Prisma.EnrollmentWhereInput) {
  const rows = await prisma.enrollment.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] }, ...where },
    select: {
      id: true,
      levelId: true,
      subject: { select: { id: true, name: true } },
      level: { select: { id: true, name: true } },
      teacher: {
        select: { user: { select: { firstName: true, lastName: true } } },
      },
      student: {
        select: {
          levelId: true,
          level: { select: { id: true, name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ student: { user: { firstName: "asc" } } }, { subject: { name: "asc" } }],
  });
  return rows.map((e) => ({
    id: e.id,
    subjectId: e.subject.id,
    subject: e.subject.name,
    level: e.level ?? e.student.level,
    teacher: fullName(e.teacher.user),
    student: fullName(e.student.user),
  }));
}
