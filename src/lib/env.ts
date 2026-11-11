/**
 * Deployment configuration checks — safe to import anywhere (no secrets returned).
 */

/** Runtime database URL, accepting the names Vercel's Postgres integrations inject. */
export const databaseUrl = () =>
  process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || "";

export const databaseConfigured = () => !!databaseUrl();

/**
 * The site's public address, for links in emails and the Google sign-in return address.
 * Never taken from request headers (a forged Host header must not end up in a reset email).
 */
export function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/** Email sending is on once a Resend API key is present. */
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/** Google sign-in is on once both OAuth credentials are present. */
export const googleConfigured = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
