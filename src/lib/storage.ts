import "server-only";
import { del, issueSignedToken, presignUrl } from "@vercel/blob";
import prisma from "./prisma";

/**
 * File storage. Large files go straight from the browser to a private Vercel Blob store (multipart for
 * big files); small files from before that, and profile photos, live in the database. Either way a file
 * is only ever reached through /files/[id], which checks who is asking first.
 */
export const blobConfigured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const MB = 1024 * 1024;
/** Per-file limits when Blob storage is available. */
export const BLOB_LIMITS: Record<string, number> = {
  resource: 2000 * MB, // documents, past papers, videos from teachers and the office
  submission: 250 * MB, // students' turned-in work
};

/** A short-lived signed link to a private blob — handed out only after an access check. */
export async function signedDownloadUrl(pathname: string, minutes = 10): Promise<string> {
  const validUntil = Date.now() + minutes * 60_000;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private", validUntil });
  return presignedUrl;
}

/** Deletes a stored file and, for Blob files, the bytes in the store. Never throws. */
export async function deleteStoredFile(id: string): Promise<void> {
  const f = await prisma.storedFile.findUnique({ where: { id }, select: { storage: true, blobPathname: true } });
  if (!f) return;
  if (f.storage === "blob" && f.blobPathname && blobConfigured()) {
    await del(f.blobPathname).catch((err) => console.error("[storage] blob delete failed", f.blobPathname, err));
  }
  await prisma.storedFile.delete({ where: { id } }).catch(() => undefined);
}
