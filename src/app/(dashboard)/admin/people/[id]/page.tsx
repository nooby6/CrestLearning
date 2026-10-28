import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, ChevronLeft, Mail, Phone } from "lucide-react";
import { formatSlot } from "@/lib/schedule";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ageFrom, formatDate, formatMoney, fullName, prettyPhone } from "@/lib/format";
import { curriculumLabel, toSlug } from "@/lib/roles";
import { Avatar, Badge, Card, DefinitionList, RoleBadge } from "@/components/ui/primitives";
import { FamilyLinks } from "./FamilyLinks";
import { AccountPanel } from "./AccountPanel";
import { AdminAccessToggle } from "./AdminAccessToggle";
import { StudentLinkEditor } from "@/components/class/StudentLinkEditor";
import { providerOf } from "@/lib/meeting";

export default async function PersonPage({ params }: { params: { id: string } }) {
  const me = await requireRole("admin");

  const u = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      student: {
        include: {
          level: true,
          guardians: { include: { parent: { include: { user: true } } }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          enrollments: {
            include: { subject: true, teacher: { include: { user: true } }, slots: { where: { active: true } } },
            where: { status: "ACTIVE" },
          },
        },
      },
      parent: {
        include: {
          children: {
            include: { student: { include: { user: true, level: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      teacher: { include: { subjects: { include: { subject: true } }, _count: { select: { enrollments: true } } } },
    },
  });
  if (!u) notFound();

  const slug = toSlug(u.role);

  // Candidates for linking — only loaded for the side that needs them.
  const candidates =
    slug === "parent"
      ? (
          await prisma.student.findMany({
            where: { user: { active: true } },
            include: { user: true, level: true },
            orderBy: { user: { firstName: "asc" } },
          })
        ).map((s) => ({
          id: s.id,
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          avatarUrl: s.user.avatarUrl,
          meta: [curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || undefined,
        }))
      : slug === "student"
        ? (
            await prisma.parent.findMany({
              where: { user: { active: true } },
              include: { user: true },
              orderBy: { user: { firstName: "asc" } },
            })
          ).map((p) => ({
            id: p.id,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
            avatarUrl: p.user.avatarUrl,
            meta: p.user.phone ? prettyPhone(p.user.phone) : undefined,
          }))
        : [];

  return (
    <>
      <Link href={`/admin/people?role=${slug}`} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> People
      </Link>

      {/* Header */}
      <div className="card mb-6 overflow-hidden">
        <div className="crest-navy relative h-20 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold-400/80 after:to-transparent" />
        <div className="flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative z-10 -mt-8 shrink-0 rounded-full bg-white p-1 shadow-sm">
              <Avatar person={u} size="lg" />
            </div>
            <div className="pt-3">
              <h1 className="font-display text-xl font-semibold text-navy-900">{fullName(u)}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-navy-400">
                <RoleBadge role={slug} />
                {u.role === "TEACHER" && u.adminAccess && <RoleBadge role="admin" />}
                {!u.active && <Badge tone="slate">Suspended</Badge>}
                <span>@{u.username}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-navy-600">
            {u.phone && (
              <a href={`tel:${u.phone}`} className="flex items-center gap-1.5 tabular-nums hover:text-navy-900">
                <Phone className="h-4 w-4 text-gold-500" /> {prettyPhone(u.phone)}
              </a>
            )}
            {u.email && (
              <a href={`mailto:${u.email}`} className="flex items-center gap-1.5 hover:text-navy-900">
                <Mail className="h-4 w-4 text-gold-500" /> {u.email}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {u.parent && (
            <Card title="Linked students" description="The students this parent can follow in their portal.">
              <FamilyLinks
                mode="children"
                selfId={u.id}
                candidates={candidates}
                links={u.parent.children.map((c) => ({
                  otherId: c.studentId,
                  firstName: c.student.user.firstName,
                  lastName: c.student.user.lastName,
                  avatarUrl: c.student.user.avatarUrl,
                  meta: c.student.level?.name,
                  relationship: c.relationship,
                  isPrimary: c.isPrimary,
                }))}
              />
            </Card>
          )}

          {u.student && (
            <>
              <Card title="Parents & guardians" description="They receive weekly reports and invoices. One is the primary contact.">
                <FamilyLinks
                  mode="guardians"
                  selfId={u.id}
                  candidates={candidates}
                  links={u.student.guardians.map((g) => ({
                    otherId: g.parentId,
                    firstName: g.parent.user.firstName,
                    lastName: g.parent.user.lastName,
                    avatarUrl: g.parent.user.avatarUrl,
                    meta: g.parent.user.phone ? prettyPhone(g.parent.user.phone) : undefined,
                    relationship: g.relationship,
                    isPrimary: g.isPrimary,
                  }))}
                />
              </Card>
              <Card
                title="Lesson link"
                description={u.student.meetingUrl ? "One Google Meet link for all of this student’s subjects." : "Add one Google Meet link — it’s used for all of this student’s subjects."}
              >
                <StudentLinkEditor studentId={u.id} url={u.student.meetingUrl} provider={providerOf(u.student.meetingUrl)} />
              </Card>
              <Card title="Learning profile">
                <DefinitionList
                  items={[
                    { label: "Curriculum", value: curriculumLabel(u.student.curriculum) },
                    { label: "Level", value: u.student.level?.name ?? "—" },
                    {
                      label: "Date of birth",
                      value: u.student.dateOfBirth
                        ? `${formatDate(u.student.dateOfBirth)} · ${ageFrom(u.student.dateOfBirth)} yrs`
                        : "—",
                    },
                    { label: "Day school", value: u.student.school ?? "—" },
                  ]}
                />
              </Card>
              <Card
                title="Subjects"
                action={
                  <Link href={`/admin/enrollments/new?student=${u.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                    <CalendarPlus className="h-3.5 w-3.5" /> Enroll
                  </Link>
                }
                bodyClassName="px-5 py-1"
              >
                {u.student.enrollments.length === 0 ? (
                  <p className="py-4 text-sm text-navy-400">Not enrolled in any subject yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {u.student.enrollments.map((e) => (
                      <li key={e.id}>
                        <Link href={`/admin/enrollments/${e.id}`} className="flex items-center justify-between py-3 text-sm hover:text-navy-700">
                          <span className="font-medium">{e.subject.name}</span>
                          <span className="text-navy-500">
                            {fullName(e.teacher.user)} · {e.slots.map((s) => formatSlot(s)).join(", ") || "no weekly time"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}

          {u.teacher && (
            <Card title="Teaching profile">
              <DefinitionList
                items={[
                  {
                    label: "Subjects",
                    value: u.teacher.subjects.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {u.teacher.subjects.map((s) => (
                          <Badge key={s.subjectId}>{s.subject.name}</Badge>
                        ))}
                      </span>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Payout rate", value: u.teacher.hourlyRate ? `${formatMoney(u.teacher.hourlyRate)} / hr` : "Not set" },
                  { label: "Weekly capacity", value: `${u.teacher.weeklyCapacityHours} hrs` },
                  { label: "Students", value: u.teacher._count.enrollments },
                ]}
              />
            </Card>
          )}

          {u.teacher && (
            <Card title="Administrator access">
              <AdminAccessToggle userId={u.id} firstName={u.firstName} on={u.adminAccess} />
            </Card>
          )}

          {u.role === "ADMIN" && (
            <Card title="Administrator">
              <p className="text-sm text-navy-500">Full access to people, schedule, finance and announcements.</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Account">
            <DefinitionList
              items={[
                { label: "Username", value: <span className="font-mono text-[13px]">@{u.username}</span> },
                { label: "Added", value: formatDate(u.createdAt) },
                {
                  label: "Last sign-in",
                  value: u.lastSignInAt
                    ? formatDate(u.lastSignInAt, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
                    : u.mustChangePassword
                      ? "Not yet — temporary password"
                      : "Never",
                },
              ]}
            />
            <div className="mt-5 border-t border-line pt-5">
              <AccountPanel
                userId={u.id}
                active={u.active}
                isSelf={u.id === me.id}
                hasLogin
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
