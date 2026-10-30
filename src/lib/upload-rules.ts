import "server-only";
import type { CurrentUser } from "./auth";
import { hasAdminAccess } from "./roles";
import { ALLOWED_TYPES } from "./work";

export const PURPOSES = ["resource", "submission", "avatar"] as const;
export type Purpose = (typeof PURPOSES)[number];
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Who may upload what. */
export function mayUpload(me: CurrentUser, purpose: Purpose): boolean {
  if (purpose === "resource") return hasAdminAccess(me) || me.role === "TEACHER";
  if (purpose === "submission") return me.role === "STUDENT";
  return hasAdminAccess(me) || me.role === "TEACHER";
}

export const allowedTypesFor = (purpose: Purpose) => (purpose === "avatar" ? IMAGE_TYPES : Object.keys(ALLOWED_TYPES));

/** Blob pathnames are namespaced per purpose and uploader, so a token can only write into the uploader's own folder. */
export const blobPrefix = (purpose: Purpose, userId: string) => `${purpose}/${userId}/`;
