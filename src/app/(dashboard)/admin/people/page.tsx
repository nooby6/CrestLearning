import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react";
import type { Prisma, Role } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName, prettyPhone } from "@/lib/format";
import { curriculumLabel, isRoleSlug, toRole, toSlug, type RoleSlug } from "@/lib/roles";
import { Avatar, Badge, EmptyState, PageHeader, RoleBadge } from "@/components/ui/primitives";
import { SearchInput } from "@/components/ui/SearchInput";

export const metadata = { title: "People" };

const PAGE_SIZE = 12;

const TABS: { slug: RoleSlug | "all"; label: string }[] = [
  { slug: "all", label: "Everyone" },
  { slug: "student", label: "Students" },
  { slug: "parent", label: "Parents" },
  { slug: "teacher", label: "Teachers" },
  { slug: "admin", label: "Admins" },
];

type SP = { role?: string; q?: string; page?: string };

export default async function PeoplePage({ searchParams }: { searchParams: SP }) {
  await requireRole("admin");

  const roleFilter = isRoleSlug(searchParams.role) ? searchParams.role : "all";
  const q = searchParams.q?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const search: Prisma.UserWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q.replace(/\s/g, "") } },
        ],
      }
    : {};
  const where: Prisma.UserWhereInput = {
    ...search,
    ...(roleFilter !== "all" ? { role: toRole(roleFilter) } : {}),
  };

  const [rows, total, counts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ active: "desc" }, { firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: rowInclude,
    }),
    prisma.user.count({ where }),
    prisma.user.groupBy({ by: ["role"], where: search, _count: true }),
  ]);

  const countFor = (slug: RoleSlug | "all") =>
    slug === "all"
      ? counts.reduce((a, c) => a + c._count, 0)
      : counts.find((c) => c.role === (toRole(slug) as Role))?._count ?? 0;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { role: roleFilter === "all" ? undefined : roleFilter, q: q || undefined, page: String(page), ...patch };
    Object.entries(merged).forEach(([k, v]) => v && !(k === "page" && v === "1") && p.set(k, v));
    const s = p.toString();
    return `/admin/people${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="People"
        description="Every login at Crest. Open someone to link parents and children, reset a password or pause access."
        actions={
          <Link href={`/admin/people/new${roleFilter !== "all" ? `?role=${roleFilter}` : ""}`} className="btn-primary">
            <UserPlus className="h-4 w-4" /> Add person
          </Link>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line px-4 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Filter by role">
            {TABS.map((t) => {
              const active = t.slug === roleFilter;
              return (
                <Link
                  key={t.slug}
                  href={href({ role: t.slug === "all" ? undefined : t.slug, page: "1" })}
                  className={clsx(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition",
                    active
                      ? "border-gold-500 font-medium text-navy-900"
                      : "border-transparent text-navy-400 hover:text-navy-700",
                  )}
                >
                  {t.label}
                  <span
                    className={clsx(
                      "rounded-full px-1.5 text-[11px] tabular-nums",
                      active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-500",
                    )}
                  >
                    {countFor(t.slug)}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="pb-3">
            <SearchInput placeholder="Name, username, email or phone" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={q ? `No one matches “${q}”` : "No one here yet"}
              action={
                !q && (
                  <Link href="/admin/people/new" className="btn-gold">
                    <UserPlus className="h-4 w-4" /> Add person
                  </Link>
                )
              }
            >
              {q ? "Try a first name, username or the last digits of a phone number." : undefined}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                  <th className="px-5 py-3 font-semibold">Person</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Role</th>
                  <th className="px-3 py-3 font-semibold">Details</th>
                  <th className="hidden px-3 py-3 font-semibold lg:table-cell">Contact</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((u) => (
                  <tr key={u.id} className={clsx("group transition hover:bg-ivory", !u.active && "opacity-60")}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/people/${u.id}`} className="flex items-center gap-3">
                        <Avatar person={u} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900 group-hover:text-navy-700 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">
                            {fullName(u)}
                          </span>
                          <span className="block truncate text-xs text-navy-400">@{u.username}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <RoleBadge role={toSlug(u.role)} />
                    </td>
                    <td className="max-w-[280px] px-3 py-3 text-navy-600">
                      <Details u={u} />
                    </td>
                    <td className="hidden px-3 py-3 text-navy-600 lg:table-cell">
                      <span className="block tabular-nums">{prettyPhone(u.phone)}</span>
                      {u.email && <span className="block truncate text-xs text-navy-400">{u.email}</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.active ? <Badge tone="green">Active</Badge> : <Badge tone="slate">Paused</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-navy-500">
            <span className="tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <PageLink href={href({ page: String(page - 1) })} disabled={page <= 1} label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </PageLink>
              <PageLink href={href({ page: String(page + 1) })} disabled={page >= pages} label="Next">
                <ChevronRight className="h-4 w-4" />
              </PageLink>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled)
    return (
      <span className="btn-ghost cursor-not-allowed px-2 py-1.5 opacity-40" aria-disabled>
        {children}
      </span>
    );
  return (
    <Link href={href} className="btn-ghost px-2 py-1.5" aria-label={label}>
      {children}
    </Link>
  );
}

const rowInclude = {
  student: { include: { level: true, guardians: { include: { parent: { include: { user: true } } } } } },
  parent: { include: { children: { include: { student: { include: { user: true } } } } } },
  teacher: { include: { subjects: { include: { subject: true } } } },
} satisfies Prisma.UserInclude;

type Row = Prisma.UserGetPayload<{ include: typeof rowInclude }>;

function Details({ u }: { u: Row }) {
  if (u.student) {
    const g = u.student.guardians;
    return (
      <span className="block truncate">
        {[curriculumLabel(u.student.curriculum), u.student.level?.name].filter((x) => x && x !== "—").join(" · ") || "No level set"}
        <span className="block truncate text-xs text-navy-400">
          {g.length ? `Guardian: ${g.map((x) => x.parent.user.firstName).join(", ")}` : <span className="text-amber-600">No guardian linked</span>}
        </span>
      </span>
    );
  }
  if (u.parent) {
    const c = u.parent.children;
    return c.length ? (
      <span className="block truncate">
        {c.length} {c.length === 1 ? "child" : "children"}
        <span className="block truncate text-xs text-navy-400">{c.map((x) => x.student.user.firstName).join(", ")}</span>
      </span>
    ) : (
      <span className="text-amber-600">No children linked</span>
    );
  }
  if (u.teacher) {
    const s = u.teacher.subjects.map((x) => x.subject.name);
    return <span className="block truncate">{s.length ? s.join(", ") : "No subjects yet"}</span>;
  }
  return <span className="text-navy-400">Full access</span>;
}
