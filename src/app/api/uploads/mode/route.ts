import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BLOB_LIMITS, blobConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Tells the upload widget whether large-file storage is available, and the caller's folder. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || !me.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  return NextResponse.json({ blob: blobConfigured(), userId: me.id, limits: blobConfigured() ? BLOB_LIMITS : null });
}
