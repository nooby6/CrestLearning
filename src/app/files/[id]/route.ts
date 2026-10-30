import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canOpenFile } from "@/lib/work";
import { signedDownloadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

const INLINE = /^(application\/pdf|image\/(jpeg|png|webp)|text\/plain)$/;

/** Serves a stored file to people allowed to see it. `?download=1` forces a download. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me || !me.active) return new NextResponse("Please sign in.", { status: 401 });

  const file = await prisma.storedFile.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, mimeType: true, purpose: true, ownerId: true, storage: true, blobPathname: true },
  });
  if (!file || !(await canOpenFile(me, file))) return new NextResponse("File not found.", { status: 404 });

  // Large files: send the browser to a signed link that expires in minutes (the bytes never pass through here).
  if (file.storage === "blob" && file.blobPathname) {
    try {
      const url = await signedDownloadUrl(file.blobPathname);
      return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    } catch (err) {
      console.error("[files] could not sign blob url", err);
      return new NextResponse("This file is temporarily unavailable.", { status: 503 });
    }
  }

  const data = await prisma.storedFileData.findUnique({ where: { fileId: file.id }, select: { bytes: true } });
  if (!data) return new NextResponse("File not found.", { status: 404 });

  const download = new URL(req.url).searchParams.has("download") || !INLINE.test(file.mimeType);
  const encoded = encodeURIComponent(file.name);
  return new NextResponse(Buffer.from(data.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(data.bytes.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encoded}`,
      // Files never change once stored (a new upload gets a new id).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
