"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/validation";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
};

const NAME = z
  .string()
  .trim()
  .min(2, "Give the subject a name")
  .max(60, "Keep the name under 60 characters")
  .transform((s) => s.replace(/\s+/g, " "));
const CODE = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,8}$/, "Use 2–8 letters or numbers, e.g. CODE or BIO");

/** "Computer Science" → "COMPSCI"-ish: first letters of each word, or the first four letters of a single word. */
function suggestCode(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  if (!words.length) return "SUBJ";
  return (words.length === 1 ? words[0].slice(0, 4) : words.map((w) => w.slice(0, 3)).join("").slice(0, 8)).padEnd(2, "X");
}

async function freeCode(base: string, exceptId?: number) {
  for (let i = 0; i < 50; i++) {
    const code = i === 0 ? base : `${base.slice(0, 7 - String(i).length)}${i + 1}`;
    const taken = await prisma.subject.findFirst({ where: { code, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true } });
    if (!taken) return code;
  }
  return `${base.slice(0, 4)}${Date.now() % 10000}`;
}

async function nameTaken(name: string, exceptId?: number) {
  return !!(await prisma.subject.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  }));
}

const CreateInput = z.object({ name: NAME, code: z.string().trim().optional(), teacherIds: z.array(z.string()).max(200).default([]) });

/** Add a subject to the catalogue, optionally with the teachers who teach it. */
export async function createSubject(input: z.input<typeof CreateInput>): Promise<ActionResult<{ id: number }>> {
  await assertRole("admin");
  const p = CreateInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Check the subject name." };
  const { name, teacherIds } = p.data;
  if (await nameTaken(name)) return { ok: false, error: `${name} is already a subject.` };

  let code: string;
  if (p.data.code) {
    const c = CODE.safeParse(p.data.code);
    if (!c.success) return { ok: false, error: c.error.issues[0].message };
    if (await prisma.subject.findUnique({ where: { code: c.data } })) return { ok: false, error: `The code ${c.data} is already used by another subject.` };
    code = c.data;
  } else code = await freeCode(suggestCode(name));

  const teachers = teacherIds.length ? await prisma.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true } }) : [];
  const s = await prisma.subject.create({
    data: { name, code, teachers: { create: teachers.map((t) => ({ teacherId: t.id })) } },
  });
  refresh();
  return {
    ok: true,
    data: { id: s.id },
    message: teachers.length ? `${name} added · taught by ${teachers.length} ${teachers.length === 1 ? "teacher" : "teachers"}` : `${name} added`,
  };
}

/** Rename a subject (and optionally its short code). Everything already linked to it keeps working. */
export async function renameSubject(id: number, input: { name: string; code: string }): Promise<ActionResult> {
  await assertRole("admin");
  const n = NAME.safeParse(input.name);
  if (!n.success) return { ok: false, error: n.error.issues[0].message };
  const c = CODE.safeParse(input.code);
  if (!c.success) return { ok: false, error: c.error.issues[0].message };
  const s = await prisma.subject.findUnique({ where: { id } });
  if (!s) return { ok: false, error: "Subject not found." };
  if (await nameTaken(n.data, id)) return { ok: false, error: `${n.data} is already a subject.` };
  if (c.data !== s.code && (await prisma.subject.findUnique({ where: { code: c.data } }))) return { ok: false, error: `The code ${c.data} is already used.` };
  await prisma.subject.update({ where: { id }, data: { name: n.data, code: c.data } });
  refresh();
  return { ok: true, message: s.name === n.data ? "Subject updated" : `${s.name} renamed to ${n.data}` };
}

/** Active students per teacher for a subject: a teacher can't stop teaching a subject while they still have students in it. */
async function activeLoad(subjectId: number) {
  const rows = await prisma.enrollment.groupBy({
    by: ["teacherId"],
    where: { subjectId, status: { in: ["ACTIVE", "PAUSED"] } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.teacherId, r._count._all]));
}

/** Set exactly which teachers teach a subject. */
export async function setSubjectTeachers(subjectId: number, teacherIds: string[]): Promise<ActionResult> {
  await assertRole("admin");
  const s = await prisma.subject.findUnique({ where: { id: subjectId }, include: { teachers: { include: { teacher: { include: { user: true } } } } } });
  if (!s) return { ok: false, error: "Subject not found." };
  const want = new Set(teacherIds);
  const removing = s.teachers.filter((t) => !want.has(t.teacherId));
  const load = await activeLoad(subjectId);
  const blocked = removing.filter((t) => load.get(t.teacherId));
  if (blocked.length) {
    const t = blocked[0];
    const n = load.get(t.teacherId)!;
    return {
      ok: false,
      error: `${t.teacher.user.firstName} ${t.teacher.user.lastName} still teaches ${s.name} to ${n} ${n === 1 ? "student" : "students"}. Move or drop those first.`,
    };
  }
  const valid = await prisma.teacher.findMany({ where: { id: { in: [...want] } }, select: { id: true } });
  await prisma.$transaction([
    prisma.teacherSubject.deleteMany({ where: { subjectId, teacherId: { in: removing.map((t) => t.teacherId) } } }),
    prisma.teacherSubject.createMany({ data: valid.map((t) => ({ teacherId: t.id, subjectId })), skipDuplicates: true }),
  ]);
  refresh();
  return { ok: true, message: `${s.name}: ${valid.length} ${valid.length === 1 ? "teacher" : "teachers"}` };
}

/** Set exactly which subjects one teacher teaches (from their profile). */
export async function setTeacherSubjects(teacherId: string, subjectIds: number[]): Promise<ActionResult> {
  await assertRole("admin");
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, include: { user: true, subjects: { include: { subject: true } } } });
  if (!t) return { ok: false, error: "Teacher not found." };
  const want = new Set(subjectIds);
  const removing = t.subjects.filter((s) => !want.has(s.subjectId));
  if (removing.length) {
    const busy = await prisma.enrollment.groupBy({
      by: ["subjectId"],
      where: { teacherId, subjectId: { in: removing.map((s) => s.subjectId) }, status: { in: ["ACTIVE", "PAUSED"] } },
      _count: { _all: true },
    });
    if (busy.length) {
      const sub = removing.find((s) => s.subjectId === busy[0].subjectId)!.subject.name;
      const n = busy[0]._count._all;
      return { ok: false, error: `${t.user.firstName} still teaches ${sub} to ${n} ${n === 1 ? "student" : "students"}. Move or drop those first.` };
    }
  }
  const valid = await prisma.subject.findMany({ where: { id: { in: [...want] } }, select: { id: true } });
  await prisma.$transaction([
    prisma.teacherSubject.deleteMany({ where: { teacherId, subjectId: { in: removing.map((s) => s.subjectId) } } }),
    prisma.teacherSubject.createMany({ data: valid.map((s) => ({ teacherId, subjectId: s.id })), skipDuplicates: true }),
  ]);
  refresh();
  revalidatePath(`/admin/people/${teacherId}`);
  return { ok: true, message: `${t.user.firstName} teaches ${valid.length} ${valid.length === 1 ? "subject" : "subjects"}` };
}

/** Remove a subject that was never used. Anything with history (students, lessons, files) is kept. */
export async function deleteSubject(id: number): Promise<ActionResult> {
  await assertRole("admin");
  const s = await prisma.subject.findUnique({ where: { id }, include: { _count: { select: { enrollments: true, resources: true } } } });
  if (!s) return { ok: false, error: "Already removed." };
  if (s._count.enrollments || s._count.resources)
    return { ok: false, error: `${s.name} has students or files on record, so it can’t be removed. Drop it for each student instead.` };
  await prisma.subject.delete({ where: { id } });
  refresh();
  return { ok: true, message: `${s.name} removed` };
}
