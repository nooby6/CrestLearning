import Link from "next/link";
import { ArrowRight, ClipboardX, GraduationCap, HeartHandshake, Link2Off, Presentation, UserPlus, UsersRound, type LucideIcon } from "lucide-react";
import prisma from "@/lib/prisma";
import { finaliseEndedSessions } from "@/lib/attendance";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { ROLE_LABEL, curriculumLabel, toSlug } from "@/lib/roles";
import { Avatar, Badge, Card, ComingNext, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const me = await requireRole("admin");

  await finaliseEndedSessions();
  const [students, parents, teachers, enrollments, orphanStudents, childlessParents, recent, unrecorded] = await Promise.all([
    prisma.student.count({ where: { user: { active: true } } }),
    prisma.parent.count({ where: { user: { active: true } } }),
    prisma.teacher.count({ where: { user: { active: true } } }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.student.findMany({
      where: { guardians: { none: {} }, user: { active: true } },
      include: { user: true, level: true },
      take: 6,
      orderBy: { user: { createdAt: "desc" } },
    }),
    prisma.parent.findMany({
      where: { children: { none: {} }, user: { active: true } },
      include: { user: true },
      take: 6,
      orderBy: { user: { createdAt: "desc" } },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, where: { role: { not: "ADMIN" } } }),
    prisma.sessionInstance.findMany({
      where: { status: "HELD", progressNote: null },
      select: { enrollment: { select: { teacher: { select: { user: true } } } } },
    }),
  ]);
  const unrecordedByTeacher = [...unrecorded.reduce((m, s) => {
    const u = s.enrollment.teacher.user;
    const cur = m.get(u.id) ?? { user: u, count: 0 };
    cur.count++;
    return m.set(u.id, cur);
  }, new Map<string, { user: (typeof unrecorded)[number]["enrollment"]["teacher"]["user"]; count: number }>()).values()];

  const attentionCount = orphanStudents.length + childlessParents.length + unrecordedByTeacher.length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title={`${greeting()}, ${me.firstName}`}
        description="Summary of accounts, enrollments and items requiring attention."
        actions={
          <Link href="/admin/people/new" className="btn-primary">
            <UserPlus className="h-4 w-4" /> Add person
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={students} icon={GraduationCap} href="/admin/people?role=student" />
        <StatCard label="Parents" value={parents} icon={HeartHandshake} href="/admin/people?role=parent" />
        <StatCard label="Teachers" value={teachers} icon={Presentation} href="/admin/people?role=teacher" />
        <StatCard label="Active enrollments" value={enrollments} hint="Teacher × student × subject" icon={UsersRound} href="/admin/enrollments" />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title={
            <span className="flex items-center gap-2">
              Needs attention
              {attentionCount > 0 && <Badge tone="amber">{attentionCount}</Badge>}
            </span>
          }
          description="Unlinked accounts and outstanding lesson records."
          bodyClassName="p-0"
        >
          {attentionCount === 0 ? (
            <div className="p-5">
              <EmptyState icon={HeartHandshake} title="Nothing needs attention">
                All accounts are linked and every held lesson has a record.
              </EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {orphanStudents.map((s) => (
                <AttentionRow
                  key={s.id}
                  href={`/admin/people/${s.id}`}
                  person={s.user}
                  meta={[curriculumLabel(s.curriculum), s.level?.name].filter(Boolean).join(" · ")}
                  issue="No parent linked"
                />
              ))}
              {unrecordedByTeacher.map(({ user, count }) => (
                <AttentionRow
                  key={`rec-${user.id}`}
                  href="/admin/attendance"
                  person={user}
                  meta="Teacher"
                  issue={`${count} lesson ${count === 1 ? "record" : "records"} outstanding`}
                  icon={ClipboardX}
                />
              ))}
              {childlessParents.map((p) => (
                <AttentionRow
                  key={p.id}
                  href={`/admin/people/${p.id}`}
                  person={p.user}
                  meta="Parent"
                  issue="No students linked"
                />
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recently added" bodyClassName="p-0">
          {recent.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={UserPlus} title="No one yet">Add your first teacher, parent or student.</EmptyState>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/people/${u.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-ivory">
                    <Avatar person={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy-900">{fullName(u)}</p>
                      <p className="text-xs text-navy-400">{ROLE_LABEL[toSlug(u.role)]}</p>
                    </div>
                    <span className="text-[11px] text-navy-300">{formatDate(u.createdAt, { year: undefined })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ComingNext module="Module 4 · Resources">
          Upload materials for one student, or for every student at a subject and level.
        </ComingNext>
        <ComingNext module="Module 5 · Announcements">
          Notices to everyone, to teachers only, or to selected parents.
        </ComingNext>
        <ComingNext module="Module 5 · Finance">
          Fee plans, invoices, M-Pesa and Flutterwave payments, and payouts from sessions held.
        </ComingNext>
      </div>
    </>
  );
}

function AttentionRow({
  href,
  person,
  meta,
  issue,
  icon: Icon = Link2Off,
}: {
  href: string;
  person: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  meta: string;
  issue: string;
  icon?: LucideIcon;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3 transition hover:bg-ivory">
        <Avatar person={person} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{fullName(person)}</p>
          <p className="truncate text-xs text-navy-400">{meta || "—"}</p>
        </div>
        <Badge tone="amber">
          <Icon className="h-3 w-3" /> {issue}
        </Badge>
        <ArrowRight className="h-4 w-4 text-navy-200 transition group-hover:translate-x-0.5 group-hover:text-gold-500" />
      </Link>
    </li>
  );
}
