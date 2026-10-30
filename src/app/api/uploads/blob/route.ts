import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { BLOB_LIMITS, blobConfigured } from "@/lib/storage";
import { PURPOSES, allowedTypesFor, blobPrefix, mayUpload, type Purpose } from "@/lib/upload-rules";

export const dynamic = "force-dynamic";

/**
 * Issues a short-lived token so the browser can upload one file straight to the private Blob store
 * (large files go up in parallel parts). Nothing passes through this server but the request for permission.
 */
export async function POST(request: Request) {
  if (!blobConfigured()) return NextResponse.json({ error: "Large-file storage isn’t set up." }, { status: 501 });
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const me = await getCurrentUser();
        if (!me || !me.active) throw new Error("Please sign in again.");
        const purpose = (JSON.parse(clientPayload || "{}") as { purpose?: string }).purpose as Purpose;
        if (!PURPOSES.includes(purpose) || purpose === "avatar") throw new Error("Unknown upload.");
        if (!mayUpload(me, purpose)) throw new Error("You can’t upload that here.");
        if (!pathname.startsWith(blobPrefix(purpose, me.id)) || pathname.includes("..")) throw new Error("Invalid file path.");
        return {
          allowedContentTypes: allowedTypesFor(purpose),
          maximumSizeInBytes: BLOB_LIMITS[purpose],
          addRandomSuffix: true,
          validUntil: Date.now() + 60 * 60 * 1000,
          tokenPayload: JSON.stringify({ userId: me.id, purpose }),
        };
      },
      // Files are registered by /api/uploads/blob/complete once the browser finishes, so no callback is needed.
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Upload couldn’t start." }, { status: 400 });
  }
}
