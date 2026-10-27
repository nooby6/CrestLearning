import type { RoleSlug } from "@/lib/roles";

export {};

declare global {
  /**
   * Clerk session token must expose public metadata:
   * Clerk Dashboard → Sessions → Customize session token →
   *   { "metadata": "{{user.public_metadata}}" }
   */
  interface CustomJwtSessionClaims {
    metadata?: { role?: RoleSlug };
  }
}
