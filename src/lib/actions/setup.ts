"use server";

import { timingSafeEqual } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { clerkConfigured } from "@/lib/env";

const Input = z.object({
  token: z.string().min(1, "Enter the setup token"),
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "At least 4 characters")
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dot, dash or underscore"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
});

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const sameSecret = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Creates the first administrator. Only works while no administrator exists,
 * and only with the ADMIN_SETUP_TOKEN set in the hosting environment.
 */
export async function createFirstAdmin(input: z.input<typeof Input>): Promise<Result> {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) return { ok: false, error: "ADMIN_SETUP_TOKEN is not set on the server." };
  if (!clerkConfigured()) return { ok: false, error: "Clerk keys are not configured yet." };

  const p = Input.safeParse(input);
  if (!p.success) {
    return { ok: false, error: "Please check the form.", fieldErrors: Object.fromEntries(p.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const d = p.data;
  if (!sameSecret(d.token, expected)) return { ok: false, error: "The setup token is incorrect.", fieldErrors: { token: "Incorrect token" } };
  if (await prisma.user.count({ where: { role: "ADMIN" } })) return { ok: false, error: "An administrator already exists. Sign in instead." };

  const clerk = await clerkClient();
  let id: string;
  try {
    const existing = (await clerk.users.getUserList({ emailAddress: [d.email] })).data[0];
    const user = existing
      ? await clerk.users.updateUser(existing.id, { password: d.password, publicMetadata: { role: "admin" } })
      : await clerk.users.createUser({
          username: d.username,
          emailAddress: [d.email],
          password: d.password,
          firstName: d.firstName,
          lastName: d.lastName,
          publicMetadata: { role: "admin" },
        });
    id = user.id;
  } catch (err) {
    if (isClerkAPIResponseError(err)) {
      const e = err.errors[0];
      const msg = e?.longMessage || e?.message || "Clerk rejected the request.";
      const hint = /username/i.test(msg)
        ? " In the Clerk dashboard, turn on Username under User & authentication, then try again."
        : "";
      return { ok: false, error: msg + hint };
    }
    return { ok: false, error: "Could not create the sign-in." };
  }

  await prisma.user.upsert({
    where: { id },
    update: { role: "ADMIN", active: true },
    create: { id, role: "ADMIN", username: d.username, firstName: d.firstName, lastName: d.lastName, email: d.email },
  });
  return { ok: true };
}
