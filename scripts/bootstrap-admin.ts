/**
 * Creates the first real administrator — in Clerk and in the database.
 *
 *   npm run bootstrap:admin -- --username faith.njeri --first Faith --last Njeri --password "…" [--email …]
 *
 * Needs CLERK_SECRET_KEY and DATABASE_URL in .env / .env.local.
 * If the Clerk user already exists (same username), it is reused and promoted.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClerkClient } from "@clerk/backend";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

async function main() {
  const username = arg("username");
  const firstName = arg("first");
  const lastName = arg("last");
  const password = arg("password");
  const email = arg("email");
  if (!username || !firstName || !lastName) {
    throw new Error("Usage: --username <u> --first <First> --last <Last> [--password <p>] [--email <e>]");
  }
  if (!process.env.CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is not set.");

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const existing = (await clerk.users.getUserList({ username: [username] })).data[0];
  const user = existing
    ? await clerk.users.updateUserMetadata(existing.id, { publicMetadata: { role: "admin" } })
    : await clerk.users.createUser({
        username,
        password,
        firstName,
        lastName,
        emailAddress: email ? [email] : undefined,
        publicMetadata: { role: "admin" },
      });

  await prisma.user.upsert({
    where: { id: user.id },
    update: { role: "ADMIN", active: true },
    create: { id: user.id, role: "ADMIN", username, firstName, lastName, email },
  });
  await prisma.$disconnect();
  console.log(`✔ ${firstName} ${lastName} (@${username}) is an administrator. Sign in at /sign-in.`);
}

main().catch((e) => {
  console.error(e.errors?.[0]?.longMessage ?? e.message ?? e);
  process.exit(1);
});
