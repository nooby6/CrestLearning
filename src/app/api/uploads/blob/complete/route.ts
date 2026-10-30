import { NextResponse } from "next/server";
import { head } from "@vercel/blob";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { BLOB_LIMITS, blobConfigured } from "@/lib/storage";
import { PURPOSES, allowedTypesFor, blobPrefix, mayUpload, type Purpose } from "@/lib/upload-rules";
import { mimeFromName } from "@/lib/work";

export const dynamic = "force-dynamic";

/**
 * Records a file the browser has just uploaded to Blob. The server reads the blob's real size and type
 * from the store (not from the browser) before accepting it.
 */
export async function POST(request: Request) {
  if (!blobConfigured()) return NextResponse.json({ error: "Large-file storage isn’t set up." }, { status: 501 });
  const me = await getCurrentUser();
  if (!me || !me.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { pathname, name, purpose } = (await request.json().catch(() => ({}))) as { pathname?: string; name?: string; purpose?: Purpose };
  if (!purpose || !PURPOSES.includes(purpose) || purpose === "avatar" || !mayUpload(me, purpose)) {
    return NextResponse.json({ error: "You can’t upload that here." }, { status: 403 });
  }
  if (!pathname || !pathname.startsWith(blobPrefix(purpose, me.id))) return NextResponse.json({ error: "Invalid file." }, { status: 400 });

  let meta: Awaited<ReturnType<typeof head>>;
  try {
    meta = await head(pathname);
  } catch {
    return NextResponse.json({ error: "The upload didn’t finish. Please try again." }, { status: 400 });
  }
  const mimeType = mimeFromName(name ?? pathname, meta.contentType);
  if (meta.size > BLOB_LIMITS[purpose] || !allowedTypesFor(purpose).includes(mimeType)) {
    return NextResponse.json({ error: "That file isn’t allowed." }, { status: 415 });
  }
  const existing = await prisma.storedFile.findUnique({ where: { blobPathname: meta.pathname }, select: { id: true, name: true, mimeType: true, sizeBytes: true } });
  if (existing) return NextResponse.json(existing);

  const cleanName = (name ?? meta.pathname.split("/").pop() ?? "file").replace(/[\\/\u0000-\u001f]/g, "").slice(0, 180) || "file";
  const stored = await prisma.storedFile.create({
    data: { name: cleanName, mimeType, sizeBytes: meta.size, purpose, ownerId: me.id, storage: "blob", blobPathname: meta.pathname },
    select: { id: true, name: true, mimeType: true, sizeBytes: true },
  });
  return NextResponse.json(stored);
}
