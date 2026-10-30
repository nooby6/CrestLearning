import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import clsx from "clsx";
import { BookPlus, CalendarDays, ChevronLeft, ExternalLink } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName, prettyPhone } from "@/lib/format";
import { curriculumLabel, relationshipLabel } from "@/lib/roles";
import { dateKey, formatTime, hoursLabel, weekdayIso } from "@/lib/schedule";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { SessionRow } from "@/components/schedule/SessionRow";
import { SessionActions } from "@/components/schedule/SessionActions";
import { StudentLinkEditor } from "@/components/class/StudentLinkEditor";
import { providerOf } from "@/lib/meeting";
import { SlotManager, StatusControls } from "./EnrollmentControls";
import { FeePlanEditor } from "@/components/finance/FinanceControls";
import { balanceOf } from "@/lib/finance";

export const metadata = { title: "Enrollment" };

const STATUS = { ACTIVE: { tone: "green", label: "Active" }, PAUSED: { tone: "amber", label: "Paused" }, ENDED: { tone: "slate", label: "Ended" } } as const;

/**
 * A student's enrollment: their details, their one lesson link, and every subject they take —
 * each with its teacher, weekly times, upcoming lessons and controls.
 * `/admin/enrollments/<number>` (an old per-subject link) redirects here.
 */
export default async function StudentEnrollmentPage({ params }: { params: { id: string } }) {
  await requireRole("admin");

  if (/^\d+$/.test(params.id)) {
    const e = await prisma.enrollment.findUnique({ where: { id: Number(params.id) }, select: { id: true, studentId: true } });
    if (!e) notFound();
    redirect(`/admin/enrollments/${e.studentId}#subject-${e.id}`);
  }

  const now = new Date();
  const s = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      level: true,
      guardians: { include: { parent: { include: { user: true } } }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      enrollments: {
        include: {
          subject: true,
          level: true,
          teacher: { include: { user: true } },
          slots: { where: { active: true } },
          sessions: {
            where: { endsAt: { gte: now }, status: { in: ["SCHEDULED", "CANCELLED"] } },
            orderBy: { startsAt: "asc" },
            take: 4,
          },
          _count: { select: { sessions: { where: { status: "HELD" } } } },
        },
        orderBy: [{ status: "asc" }, { subject: { name: "asc" } }],
      },
    },
  });
  if (!s) notFound();
  const [plan, openInvoices] = await Promise.all([
    prisma.feePlan.findFirst({ where: { studentId: s.id, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { studentId: s.id, status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, select: { total: true, amountPaid: true } }),
  ]);
  const owing = openInvoices.reduce((a, i) => a + balanceOf(i), 0);

  const current = s.enrollments.filter((e) => e.status !== "ENDED");
  const past = s.enrollments.filter((e) => e.status === "ENDED");
  const weeklyMinutes = current
    .filter((e) => e.status === "ACTIVE")
    .reduce((a, e) => a + e.slots.reduce((b, x) => b + x.durationMinutes, 0), 0);
  const enrolled = current.some((e) => e.status === "ACTIVE");

  return (
    <>
      <Link href="/admin/enrollments" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Enrollments
      </Link>

      <PageHeader
        eyebrow={enrolled ? "Enrolled student" : "Student"}
        title={fullName(s.user)}
        description={[
          [curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || "Level not set",
          `${current.length} ${current.length === 1 ? "subject" : "subjects"}`,
          weeklyMinutes ? `${hoursLabel(weeklyMinutes)} a week` : null,
        ]
          .filter(Boolean)
          .join("  ·  ")}
        actions={
          <>
            <Link href={`/admin/people/${s.id}`} className="btn-ghost">
              Profile
            </Link>
            <Link href={`/admin/enrollments/new?student=${s.id}`} className="btn-primary">
              <BookPlus className="h-4 w-4" /> Add a subject
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {current.length === 0 ? (
            <EmptyState
              icon={BookPlus}
              title="No subjects yet"
              action={
                <Link href={`/admin/enrollments/new?student=${s.id}`} className="btn-primary">
                  <BookPlus className="h-4 w-4" /> Add the first subject
                </Link>
              }
            >
              Add each subject {s.user.firstName} takes, with the teacher and the weekly times.
            </EmptyState>
          ) : (
            current.map((e) => {
              const slots = [...e.slots].sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday) || a.startTime.localeCompare(b.startTime));
              const weekly = slots.reduce((a, x) => a + x.durationMinutes, 0);
              return (
                <section key={e.id} id={`subject-${e.id}`} className="card scroll-mt-24">
                  <header className="flex flex-col gap-3 border-b border-line bg-ivory px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-semibold text-navy-900">{e.subject.name}</h2>
                        <p className="text-xs text-navy-500">
                          {[e.level?.name ?? s.level?.name, `since ${formatDate(e.startDate, { year: undefined })}`, `${e._count.sessions} held`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="hidden h-8 w-px bg-line sm:block" />
                      <Link href={`/admin/people/${e.teacherId}`} className="flex min-w-0 items-center gap-2 hover:underline hover:underline-offset-4">
                        <Avatar person={e.teacher.user} size="sm" />
                        <span className="min-w-0">
                          <span className="block text-[11px] uppercase tracking-wider text-navy-400">Teacher</span>
                          <span className="block truncate text-sm font-medium text-navy-900">{fullName(e.teacher.user)}</span>
                        </span>
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
                      <StatusControls id={e.id} status={e.status} />
                    </div>
                  </header>
                  <div className="grid gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
                    <div className="border-b border-line p-5 md:border-b-0 md:border-r">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                        Weekly times{weekly ? ` · ${hoursLabel(weekly)}` : ""}
                      </p>
                      <SlotManager enrollmentId={e.id} active={e.status === "ACTIVE"} slots={slots} />
                    </div>
                    <div className="p-5">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-navy-400">Next lessons</p>
                      {e.sessions.length === 0 ? (
                        <p className="flex items-center gap-2 py-3 text-sm text-navy-400">
                          <CalendarDays className="h-4 w-4" /> {e.status !== "ACTIVE" ? "Paused — no lessons scheduled." : "Add a weekly time to schedule lessons."}
                        </p>
                      ) : (
                        <div className="divide-y divide-line">
                          {e.sessions.map((x) => (
                            <SessionRow
                              key={x.id}
                              href={`/admin/sessions/${x.id}`}
                              startsAt={x.startsAt}
                              endsAt={x.endsAt}
                              title={formatDate(x.startsAt, { weekday: "long", month: "long", year: undefined })}
                              subtitle={x.status === "CANCELLED" ? x.cancelReason ?? "Cancelled" : x.slotId ? undefined : "Moved from its usual time"}
                              colorKey={e.subject.code}
                              status={x.status}
                              action={
                                x.status === "SCHEDULED" && +x.startsAt > Date.now() ? (
                                  <SessionActions
                                    sessionId={x.id}
                                    defaultDate={dateKey(x.startsAt)}
                                    defaultTime={formatTime(x.startsAt)}
                                    durationMinutes={(+x.endsAt - +x.startsAt) / 60000}
                                  />
                                ) : undefined
                              }
                            />
                          ))}
                        </div>
                      )}
                      <Link href={`/admin/schedule?student=${s.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-navy-500 hover:text-navy-900">
                        Full schedule <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </section>
              );
            })
          )}

          {past.length > 0 && (
            <Card title="Past subjects" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {past.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="font-medium text-navy-800">{e.subject.name}</span>
                    <span className="text-navy-500">{fullName(e.teacher.user)}</span>
                    <span className="text-xs tabular-nums text-navy-400">
                      {formatDate(e.startDate, { year: undefined })} – {e.endDate ? formatDate(e.endDate, { year: undefined }) : "—"} · {e._count.sessions} held
                    </span>
                    <StatusControls id={e.id} status={e.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Lesson link" description="One Google Meet link for all of this student’s subjects.">
            <StudentLinkEditor studentId={s.id} url={s.meetingUrl} provider={providerOf(s.meetingUrl)} />
          </Card>
          <Card
            title="Fees"
            description={owing ? <span className="font-medium text-rose-700">{formatMoney(owing)} outstanding</span> : "Nothing outstanding."}
            action={
              <Link href={`/admin/finance?q=${encodeURIComponent(fullName(s.user))}`} className="text-xs font-medium text-navy-500 hover:text-navy-900">
                Invoices →
              </Link>
            }
          >
            <FeePlanEditor studentId={s.id} plan={plan ? { name: plan.name, cycle: plan.cycle, amountKes: plan.amount / 100 } : null} />
            <Link href={`/admin/finance/new?student=${s.id}`} className="btn-ghost mt-3 w-full">
              New invoice
            </Link>
          </Card>
          <Card title="Parents & guardians" bodyClassName="p-0">
            {s.guardians.length === 0 ? (
              <p className="px-5 py-4 text-sm text-amber-700">
                No parent linked.{" "}
                <Link href={`/admin/people/${s.id}`} className="font-medium underline underline-offset-4">
                  Link one
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {s.guardians.map((g) => (
                  <li key={g.parentId}>
                    <Link href={`/admin/people/${g.parentId}`} className={clsx("flex items-center gap-3 px-5 py-3 hover:bg-ivory")}>
                      <Avatar person={g.parent.user} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{fullName(g.parent.user)}</span>
                        <span className="block text-xs text-navy-400">
                          {relationshipLabel(g.relationship)}
                          {g.parent.user.phone && ` · ${prettyPhone(g.parent.user.phone)}`}
                        </span>
                      </span>
                      {g.isPrimary && <Badge tone="gold">Primary</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
