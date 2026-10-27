import { NextResponse } from "next/server";
import { generateAll } from "@/lib/sessions";
import { finaliseEndedSessions } from "@/lib/attendance";

export const dynamic = "force-dynamic";

/**
 * Daily (vercel.json → crons): closes off ended sessions (held / missed, absences)
 * and keeps sessions materialised HORIZON_WEEKS ahead.
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const finalised = await finaliseEndedSessions();
  const result = await generateAll();
  return NextResponse.json({ ok: true, finalised, ...result, at: new Date().toISOString() });
}
