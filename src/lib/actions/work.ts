"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";
import { assertRole, type CurrentUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/roles";
import type { ActionResult } from "@/lib/validation";
import { canSeeEnrollmentWork, canSeeResource, resourceMatches, studentEnrollments } from "@/lib/work";

const refresh = () => {
  for (const p of ["/teacher", "/admin", "/parent", "/student"]) revalidatePath(p, "layout");
};

const isOffice = (me: CurrentUser, as?: "admin" | "teacher") => as === "admin" && hasAdminAccess(me);

/** Removes a stored file once nothing points at it any more. */
async function dropFileIfUnused(fileId: string | null | undefined) {
  if (!fileId) return;
  const [r, s] = await Promise.all([prisma.resource.count({ where: { fileId } }), prisma.submissionFile.count({ where: { fileId } })]);
  if (!r && !s) await deleteStoredFile(fileId);
}

/* ------------------------------------------------------------------ resources */

const ResourceInput = z
  .object({
    as: z.enum(["admin", "teacher"]),
    title: z.string().trim().min(2, "Give it a title").max(140),
    description: z.string().trim().max(2000).optional(),
    kind: z.enum(["DOCUMENT", "WORKSHEET"]),
    fileId: z.string().optional(),
    linkUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .refine((v) => !v || /^https:\/\/\S+$/.test(v), "Use a full link starting with https://"),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    audience: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("enrollment"),
        enrollmentId: z.number().int(),
      }),
      z.object({
        type: z.literal("subject"),
        subjectId: z.number().int(),
        levelId: z.number().int().optional(),
      }),
    ]),
    requestId: z.number().int().optional(),
  })
  .refine((d) => d.fileId || d.linkUrl, {
    message: "Upload a file or add a link",
    path: ["fileId"],
  });
export type ResourceInputT = z.input<typeof ResourceInput>;

/** Checks the audience and returns the columns that encode it. */
async function audienceFor(me: CurrentUser, d: z.infer<typeof ResourceInput>) {
  const office = isOffice(me, d.as);
  if (d.audience.type === "enrollment") {
    const e = await prisma.enrollment.findUnique({
      where: { id: d.audience.enrollmentId },
      select: { id: true, teacherId: true, subjectId: true, levelId: true },
    });
    if (!e || (!office && e.teacherId !== me.id)) throw new Error("Choose one of your students.");
    return {
      enrollmentId: e.id,
      subjectId: e.subjectId,
      levelId: null,
      teacherId: e.teacherId,
    };
  }
  const { subjectId, levelId } = d.audience;
  if (!office) {
    const teaches = await prisma.enrollment.count({
      where: { teacherId: me.id, subjectId, status: { not: "ENDED" } },
    });
    if (!teaches) throw new Error("You don’t have students taking that subject.");
  }
  // A teacher's subject-wide upload reaches only their own students; the office's reaches everyone.
  return {
    enrollmentId: null,
    subjectId,
    levelId: levelId ?? null,
    teacherId: office ? null : me.id,
  };
}

async function checkFile(me: CurrentUser, fileId?: string) {
  if (!fileId) return null;
  const f = await prisma.storedFile.findUnique({
    where: { id: fileId },
    select: { ownerId: true, purpose: true },
  });
  if (!f || f.purpose !== "resource" || (f.ownerId !== me.id && !hasAdminAccess(me)))
    throw new Error("That file is no longer available — please upload it again.");
  return fileId;
}

export async function createResource(input: ResourceInputT): Promise<ActionResult<{ id: number }>> {
  const me = await assertRole("admin", "teacher");
  const p = ResourceInput.safeParse(input);
  if (!p.success) {
    return {
      ok: false,
      error: p.error.issues[0].message,
      fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])),
    };
  }
  const d = p.data;
  if (d.as === "admin" && !hasAdminAccess(me)) return { ok: false, error: "You don’t have administrator access." };
  try {
    const audience = await audienceFor(me, d);
    const fileId = await checkFile(me, d.fileId);
    const r = await prisma.resource.create({
      data: {
        title: d.title,
        description: d.description || null,
        kind: d.kind,
        fileId,
        linkUrl: d.linkUrl || null,
        dueDate: d.kind === "WORKSHEET" && d.dueDate ? new Date(d.dueDate) : null,
        uploadedById: me.id,
        ...audience,
      },
    });
    if (d.requestId) {
      await prisma.workComment.updateMany({
        where: { id: d.requestId, kind: "REQUEST", resolvedAt: null },
        data: { resolvedAt: new Date(), resolvedById: me.id },
      });
    }
    refresh();
    return {
      ok: true,
      data: { id: r.id },
      message: d.kind === "WORKSHEET" ? "Worksheet shared" : "Document shared",
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function loadOwnResource(me: CurrentUser, id: number) {
  const r = await prisma.resource.findUnique({ where: { id } });
  if (!r) throw new Error("That item no longer exists.");
  if (!hasAdminAccess(me) && r.uploadedById !== me.id && r.teacherId !== me.id)
    throw new Error("Only the person who shared this, or the office, can change it.");
  return r;
}

const UpdateInput = z.object({
  title: z.string().trim().min(2, "Give it a title").max(140),
  description: z.string().trim().max(2000).optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

export async function updateResource(id: number, input: z.input<typeof UpdateInput>): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher");
  const p = UpdateInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  try {
    const r = await loadOwnResource(me, id);
    await prisma.resource.update({
      where: { id },
      data: {
        title: p.data.title,
        description: p.data.description || null,
        dueDate: r.kind === "WORKSHEET" && p.data.dueDate ? new Date(p.data.dueDate) : null,
      },
    });
    refresh();
    return { ok: true, message: "Saved" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteResource(id: number): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher");
  try {
    const r = await loadOwnResource(me, id);
    const subFiles = await prisma.submissionFile.findMany({
      where: { submission: { resourceId: id } },
      select: { fileId: true },
    });
    await prisma.resource.delete({ where: { id } });
    await dropFileIfUnused(r.fileId);
    for (const f of subFiles) await dropFileIfUnused(f.fileId);
    refresh();
    return { ok: true, message: "Removed" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/* ------------------------------------------------------------------ turning in */

const TurnInInput = z.object({
  fileIds: z.array(z.string()).max(10),
  note: z.string().trim().max(2000).optional(),
});

export async function turnIn(resourceId: number, input: z.input<typeof TurnInInput>): Promise<ActionResult> {
  const me = await assertRole("student");
  const p = TurnInInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Please check your files and note." };
  const { fileIds, note } = p.data;
  if (!fileIds.length && !note)
    return {
      ok: false,
      error: "Attach your work or write a note before turning it in.",
    };

  const r = await prisma.resource.findUnique({ where: { id: resourceId } });
  if (!r || r.kind !== "WORKSHEET") return { ok: false, error: "That worksheet no longer exists." };
  const enrollment = (await studentEnrollments(me.id)).find((e) => resourceMatches(r, e));
  if (!enrollment) return { ok: false, error: "That worksheet isn’t assigned to you." };

  const files = await prisma.storedFile.findMany({
    where: { id: { in: fileIds }, ownerId: me.id, purpose: "submission" },
    select: { id: true },
  });
  if (files.length !== new Set(fileIds).size)
    return {
      ok: false,
      error: "One of the files didn’t upload properly — please remove it and try again.",
    };

  const existing = await prisma.submission.findUnique({
    where: { resourceId_studentId: { resourceId, studentId: me.id } },
    include: { files: true },
  });
  if (existing?.status === "REVIEWED")
    return {
      ok: false,
      error: "Your teacher has already marked this. Add a comment if you’d like them to look again.",
    };

  await prisma.$transaction(async (tx) => {
    const s = existing
      ? await tx.submission.update({
          where: { id: existing.id },
          data: {
            note: note || null,
            submittedAt: new Date(),
            status: "SUBMITTED",
          },
        })
      : await tx.submission.create({
          data: {
            resourceId,
            enrollmentId: enrollment.id,
            studentId: me.id,
            note: note || null,
          },
        });
    await tx.submissionFile.deleteMany({
      where: { submissionId: s.id, fileId: { notIn: fileIds } },
    });
    await tx.submissionFile.createMany({
      data: fileIds.map((fileId) => ({ submissionId: s.id, fileId })),
      skipDuplicates: true,
    });
  });
  for (const f of existing?.files ?? []) if (!fileIds.includes(f.fileId)) await dropFileIfUnused(f.fileId);
  refresh();
  return {
    ok: true,
    message: existing ? "Updated and turned in again" : "Turned in — well done!",
  };
}

/** A student can take a turned-in worksheet back (to change it) until it is marked. */
export async function unsubmit(resourceId: number): Promise<ActionResult> {
  const me = await assertRole("student");
  const s = await prisma.submission.findUnique({
    where: { resourceId_studentId: { resourceId, studentId: me.id } },
    include: { files: true },
  });
  if (!s) return { ok: false, error: "Nothing to undo." };
  if (s.status === "REVIEWED") return { ok: false, error: "Your teacher has already marked this." };
  await prisma.submission.delete({ where: { id: s.id } });
  // The files stay stored (the turn-in form still lists them); ones not turned in again are cleared by the daily job.
  refresh();
  return {
    ok: true,
    message: "Turn-in undone. You can change your work and turn it in again.",
  };
}

const ReviewInput = z.object({
  feedback: z.string().trim().max(3000).optional(),
  mark: z.string().trim().max(40).optional(),
});

export async function reviewSubmission(submissionId: number, input: z.input<typeof ReviewInput>): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher");
  const p = ReviewInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Feedback is too long." };
  const s = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { enrollment: { select: { teacherId: true } } },
  });
  if (!s || (!hasAdminAccess(me) && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Submission not found." };
  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REVIEWED",
      feedback: p.data.feedback || null,
      mark: p.data.mark || null,
      reviewedById: me.id,
      reviewedAt: new Date(),
    },
  });
  refresh();
  return {
    ok: true,
    message: s.status === "REVIEWED" ? "Feedback updated" : "Marked — the student and parents can see your feedback",
  };
}

export async function reopenSubmission(submissionId: number): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher");
  const s = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { enrollment: { select: { teacherId: true } } },
  });
  if (!s || (!hasAdminAccess(me) && s.enrollment.teacherId !== me.id)) return { ok: false, error: "Submission not found." };
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "SUBMITTED" },
  });
  refresh();
  return { ok: true, message: "Reopened — the student can update their work" };
}

/* ------------------------------------------------------------------ comments & requests */

const CommentInput = z.object({
  enrollmentId: z.number().int(),
  resourceId: z.number().int().optional(),
  body: z.string().trim().min(1, "Write something first").max(2000),
  kind: z.enum(["COMMENT", "REQUEST"]).default("COMMENT"),
});

export async function addComment(input: z.input<typeof CommentInput>): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher", "student", "parent");
  const p = CommentInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  if (!(await canSeeEnrollmentWork(me, d.enrollmentId))) return { ok: false, error: "You can’t comment here." };
  if (d.kind === "REQUEST" && me.role !== "STUDENT" && me.role !== "PARENT")
    return {
      ok: false,
      error: "Only students and parents can request worksheets.",
    };
  if (d.resourceId) {
    const r = await prisma.resource.findUnique({ where: { id: d.resourceId } });
    const e = await prisma.enrollment.findUnique({
      where: { id: d.enrollmentId },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        subjectId: true,
        levelId: true,
        student: { select: { levelId: true } },
      },
    });
    if (!r || !e || !resourceMatches(r, { ...e, levelId: e.levelId ?? e.student.levelId })) return { ok: false, error: "That item no longer exists." };
    if (!(await canSeeResource(me, r))) return { ok: false, error: "You can’t comment here." };
  }
  await prisma.workComment.create({
    data: {
      enrollmentId: d.enrollmentId,
      resourceId: d.resourceId ?? null,
      authorId: me.id,
      body: d.body,
      kind: d.kind,
    },
  });
  refresh();
  return {
    ok: true,
    message: d.kind === "REQUEST" ? "Request sent to your teacher" : "Comment posted",
  };
}

export async function resolveRequest(commentId: number): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher");
  const c = await prisma.workComment.findUnique({
    where: { id: commentId },
    include: { enrollment: { select: { teacherId: true } } },
  });
  if (!c || c.kind !== "REQUEST" || (!hasAdminAccess(me) && c.enrollment.teacherId !== me.id)) return { ok: false, error: "Request not found." };
  await prisma.workComment.update({
    where: { id: commentId },
    data: {
      resolvedAt: c.resolvedAt ? null : new Date(),
      resolvedById: c.resolvedAt ? null : me.id,
    },
  });
  refresh();
  return {
    ok: true,
    message: c.resolvedAt ? "Request reopened" : "Request marked as done",
  };
}

export async function deleteComment(commentId: number): Promise<ActionResult> {
  const me = await assertRole("admin", "teacher", "student", "parent");
  const c = await prisma.workComment.findUnique({ where: { id: commentId } });
  if (!c || (c.authorId !== me.id && !hasAdminAccess(me))) return { ok: false, error: "Comment not found." };
  await prisma.workComment.delete({ where: { id: commentId } });
  refresh();
  return { ok: true, message: "Comment deleted" };
}
