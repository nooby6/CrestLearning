import type { Role } from "@prisma/client";

/** Role slugs (lowercase, used in URLs). */
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

type Portaled = { role: Role; adminAccess: boolean };

/** Administrator access: the ADMIN role, or a teacher the office has given admin access. */
export const hasAdminAccess = (u: Portaled) => u.role === "ADMIN" || (u.role === "TEACHER" && u.adminAccess);

/** Portals a person can open, home portal first. Teachers with admin access land on the admin portal. */
export function portalsFor(u: Portaled): RoleSlug[] {
  if (u.role === "TEACHER" && u.adminAccess) return ["admin", "teacher"];
  return [toSlug(u.role)];
}

export const homePath = (u: Portaled) => `/${portalsFor(u)[0]}`;
