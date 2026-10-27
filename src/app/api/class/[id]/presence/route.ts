import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordPresence, type PresenceEvent } from "@/lib/attendance";

export const dynamic = "force-dynamic";

const EVENTS: PresenceEvent[] = ["join", "heartbeat", "leave"];

/** Called by the class page: join → heartbeat every 30 s → leave (also via sendBeacon on tab close). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.active) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sessionId = Number(params.id);
  let event: unknown;
  try {
    event = (await req.json())?.event;
  } catch {
    event = null;
  }
  if (!Number.isInteger(sessionId) || !EVENTS.includes(event as PresenceEvent)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const s = await prisma.sessionInstance.findUnique({
    where: { id: sessionId },
    select: { enrollment: { select: { teacherId: true, studentId: true } } },
  });
  const who = s?.enrollment.teacherId === user.id ? "teacher" : s?.enrollment.studentId === user.id ? "student" : null;
  if (!s || !who) return NextResponse.json({ error: "Not your class" }, { status: 403 });

  try {
    const att = await recordPresence(sessionId, user.id, who, event as PresenceEvent);
    return NextResponse.json({ ok: true, status: att?.status ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
