/**
 * Deployment configuration checks — safe to import anywhere (no secrets returned).
 */

/** Runtime database URL, accepting the names Vercel's Postgres integrations inject. */
export const databaseUrl = () =>
  process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || "";

export const clerkConfigured = () =>
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;

export const databaseConfigured = () => !!databaseUrl();
