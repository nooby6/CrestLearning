import Link from "next/link";
import clsx from "clsx";
import { GraduationCap, UserPlus, VideoOff } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { formatSlot, formatTime, weekdayIso } from "@/lib/schedule";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/primitives";
import { SearchInput } from "@/components/ui/SearchInput";

export const metadata = { title: "Enrollments" };

/**
 * One enrollment = one student. Their subjects (each with a teacher and weekly times) sit underneath.
 * A student is "enrolled" while at least one subject is active.
 */
const TABS = [
  { key: "enrolled", label: "Enrolled" },
  { key: "paused", label: "Paused" },
  { key: "none", label: "Not enrolled" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function EnrollmentsPage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  await requireRole("admin");
  const tab: Tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "enrolled";
  const q = searchParams.q?.trim().toLowerCase() ?? "";
  const now = new Date();

  const students = await prisma.student.findMany({
    where: { user: { active: true } },
    include: {
      user: true,
      level: true,
      enrollments: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        include: {
          subject: true,
          teacher: { include: { user: true } },
          slots: { where: { active: true } },
          sessions: { where: { status: "SCHEDULED", startsAt: { gt: now } }, orderBy: { startsAt: "asc" }, take: 1 },
        },
        orderBy: { subject: { name: "asc" } },
      },
    },
    orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
  });

  const tabOf = (s: (typeof students)[number]): Tab =>
    s.enrollments.some((e) => e.status === "ACTIVE") ? "enrolled" : s.enrollments.length ? "paused" : "none";
  const matches = (s: (typeof students)[number]) =>
    !q ||
    fullName(s.user).toLowerCase().includes(q) ||
    s.enrollments.some((e) => e.subject.name.toLowerCase().includes(q) || fullName(e.teacher.user).toLowerCase().includes(q));

  const searched = students.filter(matches);
  const rows = searched.filter((s) => tabOf(s) === tab);
  const count = (t: Tab) => searched.filter((s) => tabOf(s) === t).length;

  const enrolled = students.filter((s) => tabOf(s) === "enrolled");
  const subjectsTaught = enrolled.reduce((a, s) => a + s.enrollments.filter((e) => e.status === "ACTIVE").length, 0);
  const teachers = new Set(enrolled.flatMap((s) => s.enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.teacherId))).size;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Enrollments"
        description="Every student currently enrolled, with the subjects they take, who teaches each one and when."
        actions={
          <Link href="/admin/enrollments/new" className="btn-primary">
            <UserPlus className="h-4 w-4" /> Enroll a student
          </Link>
        }
      />

      <dl className="card mb-6 grid grid-cols-3">
        {[
          { label: "Students enrolled", value: enrolled.length },
          { label: "Subjects taught", value: subjectsTaught },
          { label: "Teachers", value: teachers },
        ].map((x, i) => (
          <div key={x.label} className={clsx("px-5 py-4", i > 0 && "border-l border-line")}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{x.label}</dt>
            <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-navy-900">{x.value}</dd>
          </div>
        ))}
      </dl>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line px-4 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <nav className="-mb-px flex gap-1">
            {TABS.map((t) => {
              const active = t.key === tab;
              const qs = new URLSearchParams({ ...(t.key !== "enrolled" && { tab: t.key }), ...(q && { q }) }).toString();
              return (
                <Link
                  key={t.key}
                  href={`/admin/enrollments${qs ? `?${qs}` : ""}`}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
                    active ? "border-navy-800 font-medium text-navy-900" : "border-transparent text-navy-400 hover:text-navy-700",
                  )}
                >
                  {t.label}
                  <span className={clsx("px-1.5 text-[11px] tabular-nums", active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-500")}>{count(t.key)}</span>
                </Link>
              );
            })}
          </nav>
          <div className="pb-3">
            <SearchInput placeholder="Student, subject or teacher" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={GraduationCap}
              title={q ? `Nothing matches “${q}”` : tab === "enrolled" ? "No students enrolled yet" : tab === "paused" ? "No paused students" : "Every student is enrolled"}
              action={
                tab === "enrolled" && !q ? (
                  <Link href="/admin/enrollments/new" className="btn-primary">
                    <UserPlus className="h-4 w-4" /> Enroll a student
                  </Link>
                ) : undefined
              }
            >
              {tab === "enrolled" && !q ? "Choose a student, then add the subjects they take, their teachers and weekly times." : undefined}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="w-[26%] px-5 py-2.5">Student</th>
                  <th className="px-3 py-2.5">Subjects · teacher · weekly times</th>
                  <th className="hidden w-[16%] px-5 py-2.5 text-right lg:table-cell">Next lesson</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const next = s.enrollments
                    .flatMap((e) => e.sessions.map((x) => ({ ...x, subject: e.subject.name })))
                    .sort((a, b) => +a.startsAt - +b.startsAt)[0];
                  return (
                    <tr key={s.id} className="group border-b border-line align-top last:border-b-0 hover:bg-ivory/70">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/enrollments/${s.id}`} className="flex items-center gap-3">
                          <Avatar person={s.user} size="sm" />
                          <span className="min-w-0">
                            <span className="block font-medium text-navy-900 group-hover:underline group-hover:underline-offset-4">{fullName(s.user)}</span>
                            <span className="block truncate text-xs text-navy-400">
                              {[curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") || "Level not set"}
                            </span>
                            {!s.meetingUrl && s.enrollments.length > 0 && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                                <VideoOff className="h-3 w-3" /> No lesson link
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        {s.enrollments.length === 0 ? (
                          <Link href={`/admin/enrollments/new?student=${s.id}`} className="text-xs font-medium text-navy-500 hover:text-navy-900">
                            No subjects — add the first →
                          </Link>
                        ) : (
                          <ul className="divide-y divide-line/70 border border-line">
                            {s.enrollments.map((e) => {
                              const slots = [...e.slots].sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday) || a.startTime.localeCompare(b.startTime));
                              return (
                                <li key={e.id}>
                                  <Link
                                    href={`/admin/enrollments/${s.id}#subject-${e.id}`}
                                    className="grid grid-cols-[minmax(110px,1fr)_minmax(110px,1fr)_minmax(0,1.6fr)] items-center gap-3 bg-white px-3 py-2 hover:bg-ivory"
                                  >
                                    <span className="truncate font-medium text-navy-900">
                                      {e.subject.name}
                                      {e.status === "PAUSED" && <span className="ml-1.5 text-[11px] font-normal text-amber-700">paused</span>}
                                    </span>
                                    <span className="truncate text-navy-600">{fullName(e.teacher.user)}</span>
                                    <span className="truncate text-xs tabular-nums text-navy-500">
                                      {slots.length ? slots.map((x) => formatSlot(x)).join(" · ") : <span className="text-amber-700">No weekly time</span>}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-right tabular-nums text-navy-600 lg:table-cell">
                        {next ? (
                          <>
                            <span className="block">{formatDate(next.startsAt, { weekday: "short", year: undefined })}</span>
                            <span className="block text-xs text-navy-400">
                              {formatTime(next.startsAt)} · {next.subject}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
