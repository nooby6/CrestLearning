import Link from "next/link";
import clsx from "clsx";
import { CalendarPlus, Link2 } from "lucide-react";
import type { EnrollmentStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { formatSlot, formatTime, weekdayIso } from "@/lib/schedule";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { SearchInput } from "@/components/ui/SearchInput";

export const metadata = { title: "Enrollments" };

const TABS: { status: EnrollmentStatus; label: string }[] = [
  { status: "ACTIVE", label: "Active" },
  { status: "PAUSED", label: "Paused" },
  { status: "ENDED", label: "Ended" },
];

export default async function EnrollmentsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  await requireRole("admin");
  const status = (TABS.find((t) => t.status === searchParams.status)?.status ?? "ACTIVE") as EnrollmentStatus;
  const q = searchParams.q?.trim();

  const nameMatch = (path: "student" | "teacher"): Prisma.EnrollmentWhereInput => ({
    [path]: {
      user: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
        ],
      },
    },
  });
  const search: Prisma.EnrollmentWhereInput = q
    ? { OR: [nameMatch("student"), nameMatch("teacher"), { subject: { name: { contains: q, mode: "insensitive" } } }] }
    : {};

  const now = new Date();
  const [rows, counts] = await Promise.all([
    prisma.enrollment.findMany({
      where: { status, ...search },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
        subject: true,
        level: true,
        slots: { where: { active: true } },
        sessions: {
          where: { status: "SCHEDULED", startsAt: { gt: now } },
          orderBy: { startsAt: "asc" },
          take: 1,
        },
      },
      orderBy: [{ student: { user: { firstName: "asc" } } }, { subject: { name: "asc" } }],
    }),
    prisma.enrollment.groupBy({ by: ["status"], where: search, _count: true }),
  ]);
  const count = (s: EnrollmentStatus) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Enrollments"
        description="Who teaches whom, which subject, and when. Each weekly time creates sessions automatically."
        actions={
          <Link href="/admin/enrollments/new" className="btn-primary">
            <CalendarPlus className="h-4 w-4" /> New enrollment
          </Link>
        }
      />

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-line px-4 pt-3 sm:flex-row sm:items-end sm:justify-between sm:px-5">
          <nav className="-mb-px flex gap-1">
            {TABS.map((t) => {
              const active = t.status === status;
              const qs = new URLSearchParams({ ...(t.status !== "ACTIVE" && { status: t.status }), ...(q && { q }) }).toString();
              return (
                <Link
                  key={t.status}
                  href={`/admin/enrollments${qs ? `?${qs}` : ""}`}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition",
                    active ? "border-gold-500 font-medium text-navy-900" : "border-transparent text-navy-400 hover:text-navy-700",
                  )}
                >
                  {t.label}
                  <span className={clsx("rounded-full px-1.5 text-[11px] tabular-nums", active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-500")}>
                    {count(t.status)}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="pb-3">
            <SearchInput placeholder="Student, teacher or subject" />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Link2}
              title={q ? `Nothing matches “${q}”` : status === "ACTIVE" ? "No active enrollments yet" : `No ${status.toLowerCase()} enrollments`}
              action={
                status === "ACTIVE" && !q ? (
                  <Link href="/admin/enrollments/new" className="btn-gold">
                    <CalendarPlus className="h-4 w-4" /> New enrollment
                  </Link>
                ) : undefined
              }
            >
              {status === "ACTIVE" && !q ? "Pair a student with a teacher for a subject, then set their weekly times." : undefined}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                  <th className="px-5 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Subject</th>
                  <th className="hidden px-3 py-3 font-semibold md:table-cell">Teacher</th>
                  <th className="hidden px-3 py-3 font-semibold lg:table-cell">Weekly</th>
                  <th className="px-5 py-3 text-right font-semibold">{status === "ACTIVE" ? "Next session" : "Since"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => {
                  const next = e.sessions[0];
                  const slots = [...e.slots].sort((a, b) => weekdayIso(a.weekday) - weekdayIso(b.weekday) || a.startTime.localeCompare(b.startTime));
                  return (
                    <tr key={e.id} className="group cursor-pointer transition hover:bg-ivory">
                      <td className="px-5 py-3">
                        <Link href={`/admin/enrollments/${e.id}`} className="flex items-center gap-3">
                          <Avatar person={e.student.user} size="sm" />
                          <span className="font-medium text-navy-900 group-hover:underline group-hover:decoration-gold-400 group-hover:underline-offset-4">
                            {fullName(e.student.user)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-medium text-navy-800">{e.subject.name}</span>
                        {e.level && <span className="block text-xs text-navy-400">{e.level.name}</span>}
                      </td>
                      <td className="hidden px-3 py-3 text-navy-600 md:table-cell">{fullName(e.teacher.user)}</td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        {slots.length ? (
                          <span className="flex flex-wrap gap-1">
                            {slots.map((s) => (
                              <Badge key={s.id} tone="slate">
                                {formatSlot(s)}
                              </Badge>
                            ))}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">No weekly time</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-navy-600">
                        {status !== "ACTIVE"
                          ? formatDate(e.updatedAt)
                          : next
                            ? `${formatDate(next.startsAt, { weekday: "short", year: undefined })} · ${formatTime(next.startsAt)}`
                            : "—"}
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
