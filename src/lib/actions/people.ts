"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import { toSlug } from "@/lib/roles";
import {
  CreatePersonSchema,
  LinkSchema,
  fieldErrorsFrom,
  type ActionResult,
  type CreatePersonInput,
  type LinkInput,
} from "@/lib/validation";

const clerkMessage = (err: unknown) => {
  if (isClerkAPIResponseError(err)) {
    const e = err.errors[0];
    return e?.longMessage || e?.message || "Clerk rejected the request.";
  }
  return null;
};

const uniqueMessage = (err: unknown) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = String((err.meta?.target as string[] | undefined)?.join(", ") ?? "field");
    return `That ${target} is already in use.`;
  }
  return null;
};

/**
 * Creates the login in Clerk and the matching rows in our DB.
 * If the DB write fails, the Clerk user is rolled back so the two never drift.
 */
export async function createPerson(input: CreatePersonInput): Promise<ActionResult<{ id: string }>> {
  await assertRole("admin");

  const parsed = CreatePersonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;
  const phone = normalisePhone(data.phone);

  // Friendly duplicate checks before touching Clerk.
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

  let clerkId: string;
  const clerk = await clerkClient();
  try {
    const created = await clerk.users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      emailAddress: data.email ? [data.email] : undefined,
      publicMetadata: { role: toSlug(data.role) },
    });
    clerkId = created.id;
  } catch (err) {
    return { ok: false, error: clerkMessage(err) ?? "Could not create the login." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: clerkId,
          role: data.role,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone,
        },
      });

      switch (data.role) {
        case "TEACHER":
          await tx.teacher.create({
            data: {
              id: clerkId,
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
              id: clerkId,
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
              id: clerkId,
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
    await clerk.users.deleteUser(clerkId).catch(() => undefined);
    return { ok: false, error: uniqueMessage(err) ?? "Could not save the profile. Nothing was created." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, data: { id: clerkId }, message: `${data.firstName} ${data.lastName} was added.` };
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
  if (me.id === userId && !active) return { ok: false, error: "You can't deactivate your own account." };

  const clerk = await clerkClient();
  try {
    if (active) await clerk.users.unbanUser(userId);
    else await clerk.users.banUser(userId); // signs them out everywhere
  } catch (err) {
    // Seeded/demo users have no Clerk account — still allow the DB flag.
    if (!userId.startsWith("seed_")) return { ok: false, error: clerkMessage(err) ?? "Clerk update failed." };
  }
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/admin/people");
  return { ok: true, message: active ? "Account reactivated." : "Account deactivated and signed out." };
}

export async function resetPassword(userId: string, password: string): Promise<ActionResult> {
  await assertRole("admin");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const clerk = await clerkClient();
  try {
    await clerk.users.updateUser(userId, { password, signOutOfOtherSessions: true });
  } catch (err) {
    return { ok: false, error: clerkMessage(err) ?? "Could not reset the password." };
  }
  return { ok: true, message: "Password updated. Share it with them securely." };
}
