import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Uptime check: which region served it and how far away the database is (round-trip ms). No data returned. */
export async function GET() {
  const pings: number[] = [];
  try {
    for (let i = 0; i < 4; i++) {
      const t = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      pings.push(Math.round(performance.now() - t));
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  // The first ping includes opening the connection; the rest are the plain distance.
  const warm = pings.slice(1).sort((a, b) => a - b);
  return NextResponse.json({ ok: true, region: process.env.VERCEL_REGION ?? "local", dbConnectMs: pings[0], dbRoundTripMs: warm[1] });
}
