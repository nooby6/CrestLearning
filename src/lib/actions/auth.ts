"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/password-hash";
import { createSession, destroyAllSessions, destroySession } from "@/lib/session";
import { pendingRecordCount } from "@/lib/attendance";
import { homePath } from "@/lib/roles";

const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

export type SignInState = { error?: string } | undefined;

/** Sign in with username, email or phone number + password. */
export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  const identifier = String(form.get("identifier") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!identifier || !password) return { error: "Enter your username and password." };

  const lower = identifier.toLowerCase();
  const phone = normalisePhone(identifier);
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: lower },
        { email: lower },
        ...(phone && /^\+\d{9,15}$/.test(phone) ? [{ phone }] : []),
      ],
    },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((+user.lockedUntil - Date.now()) / 60000);
    return { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask the office to reset your password.` };
  }

  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) {
    if (user) {
      const fails = user.failedSignIns + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: fails >= MAX_FAILS ? { failedSignIns: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : { failedSignIns: fails },
      });
    }
    return { error: "That username or password is incorrect." };
  }
  if (!user.active) return { error: "This account is suspended. Please contact the Crest Learning office." };

  await prisma.user.update({ where: { id: user.id }, data: { failedSignIns: 0, lockedUntil: null, lastSignInAt: new Date() } });
  await createSession(user.id);
  redirect(user.mustChangePassword ? "/account/password?first=1" : homePath(user));
}

/** Sign out — teachers can't while lesson records are outstanding. */
export async function signOut(): Promise<{ ok: false; pending: number } | undefined> {
  const me = await getCurrentUser();
  if (me?.role === "TEACHER" && me.active) {
    const pending = await pendingRecordCount(me.id);
    if (pending > 0) return { ok: false, pending };
  }
  await destroySession();
  redirect("/sign-in");
  return undefined;
}

const ChangeInput = z
  .object({
    current: z.string().optional(),
    next: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The passwords don’t match", path: ["confirm"] });

export type ChangePasswordState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

export async function changePassword(_: ChangePasswordState, form: FormData): Promise<ChangePasswordState> {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const p = ChangeInput.safeParse({
    current: form.get("current") ?? undefined,
    next: form.get("next"),
    confirm: form.get("confirm"),
  });
  if (!p.success) return { fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };

  // A temporary password just used to sign in doesn't need re-typing.
  if (!me.mustChangePassword && !(await verifyPassword(p.data.current ?? "", me.passwordHash))) {
    return { fieldErrors: { current: "Your current password is incorrect" } };
  }
  if (await verifyPassword(p.data.next, me.passwordHash)) {
    return { fieldErrors: { next: "Choose a password different from your current one" } };
  }
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(p.data.next), mustChangePassword: false },
  });
  await destroyAllSessions(me.id, true);
  if (me.mustChangePassword) redirect(homePath(me));
  return { ok: true };
}
