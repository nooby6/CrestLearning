"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { assertRole, getCurrentUser } from "@/lib/auth";
import { currentSession, destroyAllSessions } from "@/lib/session";

type Result = { ok: true; message: string } | { ok: false; error: string };

/** Sign out one of my other devices. */
export async function endMySession(sessionId: string): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Not signed in." };
  const cur = await currentSession();
  if (cur?.id === sessionId) return { ok: false, error: "Use Sign out to end this device’s session." };
  const { count } = await prisma.session.deleteMany({ where: { id: sessionId, userId: me.id } });
  revalidatePath("/account/sessions");
  return count ? { ok: true, message: "That device has been signed out" } : { ok: false, error: "Already signed out." };
}

/** Sign out every device except this one. */
export async function endMyOtherSessions(): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "Not signed in." };
  const cur = await currentSession();
  const { count } = await prisma.session.deleteMany({ where: { userId: me.id, ...(cur ? { id: { not: cur.id } } : {}) } });
  revalidatePath("/account/sessions");
  return { ok: true, message: count ? `${count} other ${count === 1 ? "device" : "devices"} signed out` : "No other devices were signed in" };
}

/** Office: sign a person out on every device (e.g. a lost phone). */
export async function adminEndAllSessions(userId: string): Promise<Result> {
  const me = await assertRole("admin");
  if (userId === me.id) return { ok: false, error: "To sign yourself out elsewhere, use Signed-in devices in your account menu." };
  const n = await prisma.session.count({ where: { userId } });
  await destroyAllSessions(userId);
  revalidatePath(`/admin/people/${userId}`);
  return { ok: true, message: n ? `Signed out on ${n} ${n === 1 ? "device" : "devices"}` : "They weren’t signed in anywhere" };
}
