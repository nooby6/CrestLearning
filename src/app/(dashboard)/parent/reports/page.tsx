import Link from "next/link";
import clsx from "clsx";
import { FileText } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { addDaysKey, dateKey, dbDateKey, mondayOf } from "@/lib/schedule";
import { weekDigest } from "@/lib/reports";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { WeekNav } from "@/components/schedule/WeekGrid";
import { PrintButton } from "@/components/reports/PrintButton";
import { StudentWeekReport } from "@/components/reports/StudentWeekReport";

export const metadata = { title: "Weekly reports" };

const keyDate = (k: string) => new Date(`${k}T09:00:00Z`);

export default async function ParentReportsPage({ searchParams }: { searchParams: { week?: string; student?: string } }) {
  const me = await requireRole("parent");
  const links = await prisma.parentStudent.findMany({
    where: { parentId: me.id, student: { user: { active: true } } },
    include: { student: { include: { user: true, level: true } } },
    orderBy: { createdAt: "asc" },
  });
  const ids = links.map((l) => l.studentId);

  // Default to the most recent week with a submitted report, else the current week.
  let weekKey = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) ? mondayOf(searchParams.week) : null;
  if (!weekKey) {
    const latest = await prisma.weeklyReport.findFirst({
      where: { enrollment: { studentId: { in: ids } } },
      orderBy: { weekStart: "desc" },
      select: { weekStart: true },
    });
    weekKey = latest ? dbDateKey(latest.weekStart) : mondayOf(dateKey(new Date()));
  }

  const only = searchParams.student && ids.includes(searchParams.student) ? searchParams.student : null;
  const shown = only ? links.filter((l) => l.studentId === only) : links;
  const digest = ids.length ? await weekDigest({ studentId: { in: shown.map((l) => l.studentId) } }, weekKey) : [];

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ week: weekKey!, student: only ?? undefined, ...patch }).forEach(([k, v]) => v && p.set(k, v));
    return `/parent/reports?${p}`;
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Parent portal"
          title="Weekly reports"
          description="Each teacher reports weekly on progress, with every lesson’s topics, homework and attendance."
          actions={<PrintButton />}
        />
      </div>

      {/* Print heading */}
      <div className="mb-6 hidden print:block">
        <p className="font-display text-xl font-semibold text-navy-900">Crest Learning — Weekly report</p>
        <p className="text-sm text-navy-500">
          Week of {formatDate(keyDate(weekKey), { month: "long" })} – {formatDate(keyDate(addDaysKey(weekKey, 6)), { month: "long" })}
        </p>
      </div>

      {links.length === 0 ? (
        <EmptyState icon={FileText} title="No students linked to your account">
          The Crest office links your account to your students. Their reports will appear here.
        </EmptyState>
      ) : (
        <>
          <div className="card mb-6 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <WeekNav weekKey={weekKey} basePath="/parent/reports" params={{ student: only ?? undefined }} />
            {links.length > 1 && (
              <nav className="flex flex-wrap gap-1.5" aria-label="Students">
                <Chip href={qs({ student: undefined })} active={!only}>
                  All students
                </Chip>
                {links.map((l) => (
                  <Chip key={l.studentId} href={qs({ student: l.studentId })} active={only === l.studentId}>
                    {l.student.user.firstName}
                  </Chip>
                ))}
              </nav>
            )}
          </div>

          <div className="space-y-8">
            {shown.map((l) => (
              <StudentWeekReport
                key={l.studentId}
                student={{
                  id: l.studentId,
                  firstName: l.student.user.firstName,
                  lastName: l.student.user.lastName,
                  avatarUrl: l.student.user.avatarUrl,
                  curriculum: l.student.curriculum,
                  levelName: l.student.level?.name,
                }}
                items={digest.filter((d) => d.enrollment.studentId === l.studentId)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
      " border px-3 py-1 text-xs font-medium transition",
        active ? "border-navy-800 bg-navy-800 text-white" : "border-line bg-white text-navy-600 hover:border-navy-200",
      )}
    >
      {children}
    </Link>
  );
}
