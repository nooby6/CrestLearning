"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import { hashPassword } from "@/lib/password-hash";
import { destroyAllSessions } from "@/lib/session";
import {
  CreatePersonSchema,
  LinkSchema,
  fieldErrorsFrom,
  type ActionResult,
  type CreatePersonInput,
  type LinkInput,
} from "@/lib/validation";

const uniqueMessage = (err: unknown) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String((err.meta?.target as string[] | undefined)?.join(", ") ?? "field");
    return `That ${target} is already in use.`;
  }
  return null;
};

/**
 * Creates the account (sign-in + profile) in one transaction.
 * The password given is temporary: the person chooses their own at first sign-in.
 */
export async function createPerson(input: CreatePersonInput): Promise<ActionResult<{ id: string }>> {
  await assertRole("admin");

  const parsed = CreatePersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;
  const phone = normalisePhone(data.phone);

  // Friendly duplicate checks.
  const clash = await prisma.user.findFirst({
    where: {
      OR: [
        { username: data.username },
        ...(data.email ? [{ email: data.email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
    select: { username: true, email: true, phone: true },
  });
  if (clash) {
    const fieldErrors: Record<string, string> = {};
    if (clash.username === data.username) fieldErrors.username = "Username already taken";
    if (data.email && clash.email === data.email) fieldErrors.email = "Email already registered";
    if (phone && clash.phone === phone) fieldErrors.phone = "Phone already registered";
    return { ok: false, error: "Some details are already in use.", fieldErrors };
  }

  const passwordHash = await hashPassword(data.password);
  let id = "";

  try {
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          role: data.role,
          passwordHash,
          mustChangePassword: true,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone,
        },
      });
      id = u.id;

      switch (data.role) {
        case "TEACHER":
          await tx.teacher.create({
            data: {
              id,
              bio: data.bio,
              hourlyRate: data.hourlyRateKes * 100,
              weeklyCapacityHours: data.weeklyCapacityHours,
              subjects: { create: data.subjectIds.map((subjectId) => ({ subjectId })) },
            },
          });
          break;
        case "STUDENT":
          await tx.student.create({
            data: {
              id,
              curriculum: data.curriculum,
              levelId: data.levelId,
              school: data.school,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
              guardians: {
                create: data.guardianIds.map((parentId, i) => ({ parentId, isPrimary: i === 0 })),
              },
            },
          });
          break;
        case "PARENT":
          await tx.parent.create({
            data: {
              id,
              occupation: data.occupation,
              address: data.address,
              children: {
                create: data.childIds.map((studentId) => ({ studentId })),
              },
            },
          });
          break;
      }
    });
  } catch (err) {
    return { ok: false, error: uniqueMessage(err) ?? "Could not save the account. Nothing was created." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, data: { id }, message: `${data.firstName} ${data.lastName} was added.` };
}

export async function linkGuardian(input: LinkInput): Promise<ActionResult> {
  await assertRole("admin");
  const parsed = LinkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a parent and a student." };
  const { parentId, studentId, relationship, isPrimary } = parsed.data;

  const [parent, student] = await Promise.all([
    prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } }),
    prisma.student.findUnique({ where: { id: studentId }, select: { id: true } }),
  ]);
  if (!parent || !student) return { ok: false, error: "That parent or student no longer exists." };

  await prisma.$transaction(async (tx) => {
    // Only one primary contact per student.
    if (isPrimary) {
      await tx.parentStudent.updateMany({ where: { studentId }, data: { isPrimary: false } });
    }
    const existingCount = await tx.parentStudent.count({ where: { studentId } });
    await tx.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId, relationship, isPrimary: isPrimary || existingCount === 0 },
      update: { relationship, ...(isPrimary ? { isPrimary: true } : {}) },
    });
  });

  revalidatePath(`/admin/people/${parentId}`);
  revalidatePath(`/admin/people/${studentId}`);
  revalidatePath("/admin");
  return { ok: true, message: "Linked." };
}

export async function unlinkGuardian(parentId: string, studentId: string): Promise<ActionResult> {
  await assertRole("admin");
  await prisma.$transaction(async (tx) => {
    const link = await tx.parentStudent.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });
    // Promote another guardian if we just removed the primary.
    if (link.isPrimary) {
      const next = await tx.parentStudent.findFirst({ where: { studentId }, orderBy: { createdAt: "asc" } });
      if (next) {
        await tx.parentStudent.update({
          where: { parentId_studentId: { parentId: next.parentId, studentId } },
          data: { isPrimary: true },
        });
      }
    }
  });
  revalidatePath(`/admin/people/${parentId}`);
  revalidatePath(`/admin/people/${studentId}`);
  revalidatePath("/admin");
  return { ok: true, message: "Link removed." };
}

export async function makePrimaryGuardian(parentId: string, studentId: string): Promise<ActionResult> {
  return linkGuardian({ parentId, studentId, isPrimary: true, relationship: await currentRelationship(parentId, studentId) });
}

async function currentRelationship(parentId: string, studentId: string) {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { relationship: true },
  });
  return link?.relationship ?? "GUARDIAN";
}

export async function setActive(userId: string, active: boolean): Promise<ActionResult> {
  const me = await assertRole("admin");
  if (me.id === userId && !active) return { ok: false, error: "You can't suspend your own account." };
  await prisma.user.update({ where: { id: userId }, data: { active } });
  if (!active) await destroyAllSessions(userId); // signs them out everywhere
  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/admin/people");
  return { ok: true, message: active ? "Account reactivated." : "Account suspended and signed out." };
}

export async function resetPassword(userId: string, password: string): Promise<ActionResult> {
  const me = await assertRole("admin");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      // Others choose their own at next sign-in; an admin resetting their own password keeps it.
      mustChangePassword: userId !== me.id,
      failedSignIns: 0,
      lockedUntil: null,
    },
  });
  await destroyAllSessions(userId, userId === me.id);
  return { ok: true, message: "Password reset. They’ll choose their own the next time they sign in." };
}

/** Give a teacher administrator access (or take it away). They keep their students and teacher portal. */
export async function setAdminAccess(userId: string, on: boolean): Promise<ActionResult> {
  const me = await assertRole("admin");
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, firstName: true } });
  if (!u) return { ok: false, error: "Person not found." };
  if (u.role !== "TEACHER") return { ok: false, error: "Only teachers can be given administrator access." };
  if (!on && me.id === userId) {
    const others = await prisma.user.count({
      where: { id: { not: userId }, active: true, OR: [{ role: "ADMIN" }, { role: "TEACHER", adminAccess: true }] },
    });
    if (!others) return { ok: false, error: "You’re the only administrator — give someone else access first." };
  }
  await prisma.user.update({ where: { id: userId }, data: { adminAccess: on } });
  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/admin/people");
  return {
    ok: true,
    message: on
      ? `${u.firstName} now has administrator access. They’ll see the admin portal the next time they open Crest.`
      : `Administrator access removed for ${u.firstName}.`,
  };
}
