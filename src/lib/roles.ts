import type { Role } from "@prisma/client";

/** Roles as stored in Clerk publicMetadata (lowercase, used in URLs). */
export type RoleSlug = "admin" | "teacher" | "student" | "parent";

export const ROLE_SLUGS: RoleSlug[] = ["admin", "teacher", "student", "parent"];

export const toSlug = (role: Role): RoleSlug => role.toLowerCase() as RoleSlug;
export const toRole = (slug: RoleSlug): Role => slug.toUpperCase() as Role;

export const isRoleSlug = (v: unknown): v is RoleSlug =>
  typeof v === "string" && (ROLE_SLUGS as string[]).includes(v);

export const ROLE_LABEL: Record<RoleSlug, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

export const CURRICULA = [
  { value: "CAMBRIDGE", label: "Cambridge" },
  { value: "EDEXCEL", label: "Edexcel" },
  { value: "CBE", label: "CBE" },
  { value: "IB", label: "IB" },
] as const;

export const curriculumLabel = (c?: string | null) =>
  CURRICULA.find((x) => x.value === c)?.label ?? "—";

export const RELATIONSHIPS = [
  { value: "MOTHER", label: "Mother" },
  { value: "FATHER", label: "Father" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "OTHER", label: "Other" },
] as const;

export const relationshipLabel = (r: string) =>
  RELATIONSHIPS.find((x) => x.value === r)?.label ?? r;
