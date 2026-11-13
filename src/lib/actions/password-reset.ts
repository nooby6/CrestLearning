"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { appUrl, emailConfigured } from "@/lib/env";
import { brandedEmail, sendEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password-hash";
import { destroyAllSessions } from "@/lib/session";

const LINK_MINUTES = 30;
const MAX_PER_HOUR = 3;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export type ForgotState = { sent?: boolean; error?: string } | undefined;

/**
 * Emails a single-use reset link if the username/email belongs to an active account with an email address.
 * The reply is the same either way, so the form can't be used to discover who has an account.
 */
export async function requestPasswordReset(_: ForgotState, form: FormData): Promise<ForgotState> {
  if (!emailConfigured()) return { error: "Password reset by email isn’t switched on yet. Please ask the Crest office." };
  const identifier = String(form.get("identifier") ?? "").trim().toLowerCase();
  if (!identifier) return { error: "Enter your username or email address." };

  const user = await prisma.user.findFirst({ where: { OR: [{ username: identifier }, { email: identifier }] } });
  if (user?.active && user.email) {
    const recent = await prisma.passwordReset.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
    if (recent < MAX_PER_HOUR) {
      const token = randomBytes(32).toString("base64url");
      await prisma.$transaction([
        // Only the newest link works.
        prisma.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
        prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) } }),
      ]);
      const url = `${appUrl()}/reset-password?token=${token}`;
      const mail = brandedEmail({
        heading: "Reset your password",
        paragraphs: [
          `Hello ${user.firstName},`,
          `Someone asked to reset the password for the Crest Learning & STEM Centre account @${user.username}. If it was you, choose a new password below. The link works once and expires in ${LINK_MINUTES} minutes.`,
        ],
        button: { label: "Choose a new password", url },
        footer: "If you didn’t ask for this, ignore this email — your password stays the same.",
      });
      await sendEmail({ to: user.email, subject: "Reset your Crest password", ...mail });
    }
  }
  return { sent: true };
}

const ResetInput = z
  .object({
    token: z.string().min(20),
    next: z.string().min(8, "Use at least 8 characters").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "The passwords don’t match", path: ["confirm"] });

export type ResetState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const p = ResetInput.safeParse({ token: form.get("token"), next: form.get("next"), confirm: form.get("confirm") });
  if (!p.success) {
    const fe = Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message]));
    if (fe.token) return { error: "This reset link is invalid. Ask for a new one." };
    return { fieldErrors: fe };
  }
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: sha256(p.data.token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date() || !row.user.active) return { error: "This reset link has expired or was already used. Ask for a new one." };

  // Mark used first, conditionally, so the same link can't be used twice at once.
  const { count } = await prisma.passwordReset.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (!count) return { error: "This reset link was already used. Ask for a new one." };
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(p.data.next), mustChangePassword: false, failedSignIns: 0, lockedUntil: null },
  });
  await destroyAllSessions(row.userId); // sign out everywhere: whoever had the old password is out
  redirect("/sign-in?reset=1");
}
