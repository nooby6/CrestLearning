import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recordPresence } from "@/lib/attendance";
import { joinState } from "@/lib/classroom";
import { sessionLink } from "@/lib/meeting";

export const dynamic = "force-dynamic";

/**
 * The "Join class" button lands here. It checks who is asking, records the join
 * (attendance) and only then redirects to the meeting — so the Meet link itself is
 * never printed on any page, and only the session's student and teacher can reach it,
 * and only while the class is open.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.url), { status: 303 });
  const me = await getCurrentUser();
  if (!me || !me.active) return back("/sign-in");

  const id = Number(params.id);
  if (!Number.isInteger(id)) return back("/");
  const s = await prisma.sessionInstance.findUnique({
    where: { id },
    include: { enrollment: { select: { teacherId: true, studentId: true, student: { select: { meetingUrl: true } } } }, rescheduledTo: { select: { id: true } } },
  });
  if (!s) return back("/");
  if (s.status === "RESCHEDULED" && s.rescheduledTo) return back(`/class/${s.rescheduledTo.id}/go`);

  const who = s.enrollment.teacherId === me.id ? "teacher" : s.enrollment.studentId === me.id ? "student" : null;
  if (!who) return back("/");

  const link = sessionLink(s);
  if (!link || joinState(s, who) !== "open") return back(`/class/${id}`);

  await recordPresence(id, me.id, who, "join").catch(() => undefined);
  const res = NextResponse.redirect(link, { status: 303 });
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
