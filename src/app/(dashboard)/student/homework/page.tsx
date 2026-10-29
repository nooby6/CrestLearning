import { BookOpenCheck } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { dateKey, dbDateKey } from "@/lib/schedule";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { tintFor } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Homework" };

export default async function StudentHomework() {
  const me = await requireRole("student");
  const today = dateKey(new Date());
  const items = await prisma.progressNote.findMany({
    where: { session: { enrollment: { studentId: me.id } }, homework: { not: null } },
    include: { session: { include: { enrollment: { include: { subject: true, teacher: { include: { user: true } } } } } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const due = (d: Date | null) => (d ? dbDateKey(d) : null);
  const upcoming = items.filter((h) => !due(h.homeworkDue) || due(h.homeworkDue)! >= today).sort((a, b) => (due(a.homeworkDue) ?? "9").localeCompare(due(b.homeworkDue) ?? "9"));
  const past = items.filter((h) => due(h.homeworkDue) && due(h.homeworkDue)! < today);

  const List = ({ list }: { list: typeof items }) => (
    <ul className="divide-y divide-line">
      {list.map((h) => {
        const e = h.session.enrollment;
        const d = due(h.homeworkDue);
        return (
          <li key={h.id} className="flex items-start gap-3 px-5 py-3">
            <span className={`mt-1 h-8 w-1 shrink-0 border-l-[3px] ${tintFor(e.subject.code)}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-navy-900">{h.homework}</p>
              <p className="text-xs text-navy-400">
                {e.subject.name} · {fullName(e.teacher.user)} · set {formatDate(h.session.startsAt, { weekday: "short", year: undefined })}
              </p>
            </div>
            {d ? (
              <Badge tone={d === today ? "amber" : d < today ? "slate" : "navy"}>
                {d === today ? "Due today" : `Due ${formatDate(new Date(d), { weekday: "short", year: undefined })}`}
              </Badge>
            ) : (
              <Badge tone="slate">No due date</Badge>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <PageHeader eyebrow="Student portal" title="Homework" description="Set by your teachers at the end of each lesson." />
      {items.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="No homework yet" />
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="border-b border-line px-5 py-4 font-display text-sm font-semibold text-navy-900">To do</h2>
            {upcoming.length ? <List list={upcoming} /> : <p className="px-5 py-4 text-sm text-navy-400">Nothing due. Well done.</p>}
          </section>
          {past.length > 0 && (
            <section className="card">
              <h2 className="border-b border-line px-5 py-4 font-display text-sm font-semibold text-navy-900">Earlier</h2>
              <List list={past} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
