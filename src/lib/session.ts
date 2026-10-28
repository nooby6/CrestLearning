import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import prisma from "./prisma";

/**
 * Database-backed sessions.
 * The browser holds a random 32-byte token in an httpOnly cookie; the database stores only its SHA-256,
 * so a database leak doesn't expose usable sessions. Suspending a user or changing a password deletes them.
 */
export const SESSION_COOKIE = "crest_session";
const DAYS = 30;
const TOUCH_EVERY_MS = 60 * 60 * 1000; // refresh lastSeenAt at most hourly

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DAYS * 86_400_000);
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt, userAgent: headers().get("user-agent")?.slice(0, 300) ?? null },
  });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The user id for the current request's session, or null. */
export async function sessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!s) return null;
  if (s.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: s.id } }).catch(() => undefined);
    return null;
  }
  if (Date.now() - +s.lastSeenAt > TOUCH_EVERY_MS) {
    await prisma.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return s.userId;
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
