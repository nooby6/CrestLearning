import Link from "next/link";
import { ArrowRight, ClipboardX, GraduationCap, HeartHandshake, Link2Off, Presentation, UserPlus, UsersRound, VideoOff, type LucideIcon } from "lucide-react";
import prisma from "@/lib/prisma";
import { finaliseEndedSessions } from "@/lib/attendance";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName, greeting } from "@/lib/format";
import { ROLE_LABEL, curriculumLabel, toSlug } from "@/lib/roles";
import { Avatar, Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { HBars, Legend, PercentLine, StackedColumns } from "@/components/charts/Charts";
import { SERIES } from "@/components/charts/palette";
import { adminInsights } from "@/lib/insights";
import { dayLabel, lastEndedPeriod, periodLabel, periodSummary } from "@/lib/payouts";
import { AlertTriangle, Banknote, BarChart3, Wallet } from "lucide-react";
import { financeSummary } from "@/lib/finance";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const me = await requireRole("admin");

  await finaliseEndedSessions();
  const insightsP = adminInsights();
  const payPeriod = lastEndedPeriod();
  const payP = periodSummary(payPeriod);
  const feesP = financeSummary();
  const [students, parents, teachers, enrolledStudents, subjectsTaught, orphanStudents, childlessParents, recent, unrecorded, noLink] = await Promise.all([
    prisma.student.count({ where: { user: { active: true } } }),
    prisma.parent.count({ where: { user: { active: true } } }),
    prisma.teacher.count({ where: { user: { active: true } } }),
    prisma.student.count({ where: { user: { active: true }, enrollments: { some: { status: "ACTIVE" } } } }),
    prisma.enrollment.count({ where: { status: "ACTIVE", student: { user: { active: true } } } }),
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
    prisma.student.findMany({
      where: { meetingUrl: null, user: { active: true }, enrollments: { some: { status: "ACTIVE", slots: { some: { active: true } } } } },
      include: { user: true, enrollments: { where: { status: "ACTIVE" }, include: { subject: true }, orderBy: { subject: { name: "asc" } } } },
      take: 8,
    }),
  ]);
  const unrecordedByTeacher = [...unrecorded.reduce((m, s) => {
    const u = s.enrollment.teacher.user;
    const cur = m.get(u.id) ?? { user: u, count: 0 };
    cur.count++;
    return m.set(u.id, cur);
  }, new Map<string, { user: (typeof unrecorded)[number]["enrollment"]["teacher"]["user"]; count: number }>()).values()];

  const { weeks, subjectBars, load } = await insightsP;
  const fees = await feesP;
  const payRows = (await payP).filter((r) => r.owed > 0);
  const payOwed = payRows.reduce((a, r) => a + r.owed, 0);
  const hasLessons = weeks.some((w) => w.held + w.missed > 0);
  const hasAttendance = weeks.some((w) => w.attendance !== null);
  const heldThisWeek = weeks.at(-1)!.held;
  const hrs = (m: number) => `${Math.round((m / 60) * 10) / 10}h`;

  const attentionCount = orphanStudents.length + childlessParents.length + unrecordedByTeacher.length + noLink.length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title={`${greeting()}, ${me.firstName}`}
        description="Students, teaching load and anything that needs the office’s attention."
        actions={
          <Link href="/admin/people/new" className="btn-primary">
            <UserPlus className="h-4 w-4" /> Add person
          </Link>
        }
      />

      {payOwed > 0 && (
        <Link
          href={`/admin/payments?period=${payPeriod.start}`}
          className="mb-6 flex items-center justify-between gap-3 border border-amber-300 border-l-[3px] border-l-amber-500 bg-amber-50 px-5 py-3 text-sm text-amber-900 hover:border-amber-400"
        >
          <span>
            <b>{formatMoney(payOwed)}</b> owed to {payRows.length} {payRows.length === 1 ? "teacher" : "teachers"} for {periodLabel(payPeriod)} · due{" "}
            {dayLabel(payPeriod.due, { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium">
            Confirm payments <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Students enrolled" value={enrolledStudents} hint={`${students} student ${students === 1 ? "account" : "accounts"}`} icon={GraduationCap} href="/admin/enrollments" />
        <StatCard tone="sky" label="Subjects taught" value={subjectsTaught} hint="Across enrolled students" icon={UsersRound} href="/admin/enrollments" />
        <StatCard tone="teal" label="Teachers" value={teachers} icon={Presentation} href="/admin/people?role=teacher" />
        <StatCard tone="gold" label="Parents" value={parents} icon={HeartHandshake} href="/admin/people?role=parent" />
      </div>


      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Lessons per week"
          description={`Last 8 weeks · ${heldThisWeek} held so far this week`}
          action={hasLessons ? <Legend items={[{ label: "Held", color: SERIES[0] }, { label: "Missed", color: SERIES[1] }]} /> : undefined}
        >
          {hasLessons ? (
            <StackedColumns data={weeks.map((w) => ({ label: w.label, values: [w.held, w.missed] }))} series={["Held", "Missed"]} />
          ) : (
            <ChartEmpty>Held and missed lessons appear here once the first lessons take place.</ChartEmpty>
          )}
        </Card>
        <Card title="Student attendance" description="Share of lessons attended, per week">
          {hasAttendance ? (
            <PercentLine data={weeks.map((w) => ({ label: w.label, value: w.attendance }))} label="Weekly student attendance rate" />
          ) : (
            <ChartEmpty>Attendance is recorded automatically when students join their lessons.</ChartEmpty>
          )}
        </Card>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <Card title="Students per subject" description="Enrolled students taking each subject" action={<Link href="/admin/enrollments" className="text-xs font-medium text-gold-600 hover:underline">View all</Link>}>
          {subjectBars.length ? (
            <HBars data={subjectBars.slice(0, 8).map((b) => ({ ...b, display: String(b.value) }))} />
          ) : (
            <ChartEmpty>Enroll a student to see which subjects are in demand.</ChartEmpty>
          )}
        </Card>
        <Card title="Teacher load" description="Booked weekly lesson time against each teacher’s capacity">
          {load.length ? (
            <HBars
              data={load.slice(0, 8).map((t) => ({
                label: t.label,
                value: t.bookedMinutes,
                max: t.capacityMinutes,
                href: `/admin/people/${t.id}`,
                display: `${hrs(t.bookedMinutes)} of ${hrs(t.capacityMinutes)}${t.bookedMinutes > t.capacityMinutes ? " · over capacity" : ""}`,
              }))}
            />
          ) : (
            <ChartEmpty>Add teachers from People to see how their weeks are filling up.</ChartEmpty>
          )}
        </Card>
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
          description="Unlinked accounts, missing lesson links and outstanding lesson records."
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
              {noLink.map((st) => (
                <AttentionRow
                  key={`link-${st.id}`}
                  href={`/admin/people/${st.id}`}
                  person={st.user}
                  meta={st.enrollments.map((e) => e.subject.name).join(", ")}
                  issue="No lesson link"
                  icon={VideoOff}
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
        <StatCard label="Fees outstanding" value={formatMoney(fees.outstanding)} hint="Unpaid invoices" icon={Wallet} tone="navy" href="/admin/finance" />
        <StatCard
          label="Fees overdue"
          value={formatMoney(fees.overdue)}
          hint={fees.overdueCount ? `${fees.overdueCount} past due` : "Nothing past due"}
          icon={AlertTriangle}
          tone="rose"
          href="/admin/finance?tab=overdue"
        />
        <StatCard label="Collected this month" value={formatMoney(fees.collectedThisMonth)} hint={fees.drafts ? `${fees.drafts} draft invoices to issue` : "Payments recorded"} icon={Banknote} tone="teal" href="/admin/finance" />
      </div>
    </>
  );
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-ivory/60 px-6 text-center">
      <BarChart3 className="h-6 w-6 text-navy-200" strokeWidth={1.75} />
      <p className="max-w-xs text-xs text-navy-400">{children}</p>
    </div>
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
