import { z } from "zod";

const name = z.string().trim().min(1, "Required").max(60);
const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const phone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^(\+?254|0)?[17]\d{8}$/.test(v.replace(/\s/g, "")), {
    message: "Use a Kenyan number, e.g. 0712 345 678",
  });

const base = z.object({
  firstName: name,
  lastName: name,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "At least 4 characters")
    .max(32)
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dot, dash or underscore only"),
  password: z.string().min(8, "At least 8 characters").max(72),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  phone,
});

export const CreatePersonSchema = z.discriminatedUnion("role", [
  base.extend({
    role: z.literal("ADMIN"),
  }),
  base.extend({
    role: z.literal("TEACHER"),
    subjectIds: z.array(z.number().int()).default([]),
    hourlyRateKes: z.coerce.number().int().min(0).max(100_000).default(0),
    weeklyCapacityHours: z.coerce.number().int().min(1).max(80).default(20),
    bio: optionalText,
  }),
  base.extend({
    role: z.literal("STUDENT"),
    curriculum: z.enum(["CAMBRIDGE", "EDEXCEL", "CBE", "IB"]).optional(),
    levelId: z.number().int().optional(),
    dateOfBirth: optionalText,
    school: optionalText,
    guardianIds: z.array(z.string()).default([]),
  }),
  base.extend({
    role: z.literal("PARENT"),
    phone: phone.refine((v) => !!v, "Phone is required for M-Pesa billing"),
    occupation: optionalText,
    address: optionalText,
    childIds: z.array(z.string()).default([]),
  }),
]);

export type CreatePersonInput = z.input<typeof CreatePersonSchema>;

export const LinkSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  relationship: z.enum(["MOTHER", "FATHER", "GUARDIAN", "OTHER"]).default("GUARDIAN"),
  isPrimary: z.boolean().default(false),
});

export type LinkInput = z.input<typeof LinkSchema>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const fieldErrorsFrom = (e: z.ZodError) =>
  Object.fromEntries(e.issues.map((i) => [i.path.join("."), i.message]));
