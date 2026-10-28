import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminAccess } from "@/lib/roles";
import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, mimeFromName } from "@/lib/work";

export const dynamic = "force-dynamic";

const PURPOSES = ["resource", "submission", "avatar"] as const;
type Purpose = (typeof PURPOSES)[number];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Stores one file and returns its id. Forms then attach the id (to a resource, a submission or a profile).
 * Files nobody attaches are removed by the daily housekeeping job.
 */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !me.active) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "That upload didn’t arrive. Please try again." }, { status: 400 });
  }
  const purpose = String(form.get("purpose") ?? "") as Purpose;
  const file = form.get("file");
  if (!PURPOSES.includes(purpose)) return NextResponse.json({ error: "Unknown upload." }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });

  const allowed =
    purpose === "resource"
      ? hasAdminAccess(me) || me.role === "TEACHER"
      : purpose === "submission"
        ? me.role === "STUDENT"
        : hasAdminAccess(me) || me.role === "TEACHER";
  if (!allowed) return NextResponse.json({ error: "You can’t upload that here." }, { status: 403 });

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: `“${file.name}” is larger than 4 MB. Please upload a smaller copy.` }, { status: 413 });
  }
  const mimeType = mimeFromName(file.name, file.type);
  const okType = purpose === "avatar" ? IMAGE_TYPES.includes(mimeType) : mimeType in ALLOWED_TYPES;
  if (!okType) {
    return NextResponse.json(
      {
        error:
          purpose === "avatar"
            ? "Use a JPG, PNG or WebP photo."
            : `“${file.name}” isn’t a supported file. Use PDF, Word, PowerPoint, Excel, a photo or a text file.`,
      },
      { status: 415 },
    );
  }

  const name = file.name.replace(/[\\/\u0000-\u001f]/g, "").slice(0, 180) || "file";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await prisma.storedFile.create({
    data: { name, mimeType, sizeBytes: bytes.byteLength, purpose, ownerId: me.id, data: { create: { bytes } } },
    select: { id: true, name: true, mimeType: true, sizeBytes: true },
  });
  return NextResponse.json(stored);
}
