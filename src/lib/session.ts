import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import prisma from "./prisma";

/**
 * Database-backed sessions.
 * The browser holds a random 32-byte token in an httpOnly cookie; the database stores only its SHA-256,
 * so a database leak doesn't expose usable sessions. Suspending a user or changing a password deletes them.
 */
export const SESSION_COOKIE = "crest_session";
/** Every sign-in lasts this long, however active the person is; then they must sign in again. */
export const SESSION_HOURS = 3;
const SESSION_MS = SESSION_HOURS * 3_600_000;
const TOUCH_EVERY_MS = 10 * 60 * 1000; // refresh lastSeenAt at most every 10 minutes

/** A session ends 3 h after sign-in — also applied to sessions created before this limit existed. */
const endOf = (s: { createdAt: Date; expiresAt: Date }) => new Date(Math.min(+s.expiresAt, +s.createdAt + SESSION_MS));

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string, method: "password" | "google" = "password") {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, method, userAgent: headers().get("user-agent")?.slice(0, 300) ?? null },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The current request's session (id, user, when it ends), or null if signed out or timed out. */
export const currentSession = cache(async (): Promise<{ id: string; userId: string; endsAt: Date } | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s) return null;
  const endsAt = endOf(s);
  if (endsAt <= new Date()) {
    await prisma.session.delete({ where: { id: s.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - +s.lastSeenAt > TOUCH_EVERY_MS) {
    await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return { id: s.id, userId: s.userId, endsAt };
});

/** The user id for the current request's session, or null. */
export async function sessionUserId(): Promise<string | null> {
  return (await currentSession())?.userId ?? null;
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  cookies().delete(SESSION_COOKIE);
}

/** Sign a user out everywhere (suspension, password reset). Optionally keep the current browser signed in. */
export async function destroyAllSessions(userId: string, keepCurrent = false) {
  const token = keepCurrent ? cookies().get(SESSION_COOKIE)?.value : undefined;
  await prisma.session.deleteMany({
    where: { userId, ...(token ? { tokenHash: { not: sha256(token) } } : {}) },
  });
}

/** Delete sign-ins that have ended (daily cron). */
export async function purgeEndedSessions() {
  const now = new Date();
  const { count } = await prisma.session.deleteMany({
    where: { OR: [{ expiresAt: { lte: now } }, { createdAt: { lte: new Date(+now - SESSION_MS) } }] },
  });
  await prisma.passwordReset.deleteMany({ where: { createdAt: { lte: new Date(+now - 86_400_000) } } });
  return count;
}

/** A user's sign-ins that are still running, newest first. */
export async function activeSessions(userId: string) {
  const rows = await prisma.session.findMany({ where: { userId }, orderBy: { lastSeenAt: "desc" } });
  const now = Date.now();
  return rows.map((r) => ({ ...r, endsAt: endOf(r) })).filter((r) => +r.endsAt > now);
}

export const sessionTokenHash = sha256;
