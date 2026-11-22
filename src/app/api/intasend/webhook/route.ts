import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { syncWallet } from "@/lib/wallet-sync";

export const dynamic = "force-dynamic";

/**
 * IntaSend calls this when a top-up or teacher payment changes state.
 * If INTASEND_WEBHOOK_CHALLENGE is set, the challenge in the body must match it.
 * The body is never trusted on its own: the matching entry is re-checked with IntaSend before anything changes.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const expected = process.env.INTASEND_WEBHOOK_CHALLENGE;
  if (expected && body.challenge !== expected) return NextResponse.json({ ok: false }, { status: 401 });

  const ref = typeof body.invoice_id === "string" ? body.invoice_id : typeof body.tracking_id === "string" ? body.tracking_id : null;
  if (ref && (await prisma.walletEntry.count({ where: { providerRef: ref, status: "PENDING" } }))) await syncWallet({ ref });
  return NextResponse.json({ ok: true });
}
