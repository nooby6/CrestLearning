import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { weekSessions } from "@/lib/timetable";
import { PageHeader } from "@/components/ui/primitives";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { WeekGrid, WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Timetable" };

export default async function ParentTimetable({ searchParams }: { searchParams: { week?: string; child?: string } }) {
  const me = await requireRole("parent");
  const weekKey = resolveWeek(searchParams.week);
  const links = await prisma.parentStudent.findMany({
    where: { parentId: me.id },
    include: { student: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });
  const childIds = links.map((l) => l.studentId);
  // Only ever the parent's own children, even if ?child= is tampered with.
  const ids = searchParams.child && childIds.includes(searchParams.child) ? [searchParams.child] : childIds;
  const sessions = await weekSessions(weekKey, { studentId: { in: ids } }, "parent");

  return (
    <>
      <PageHeader eyebrow="Parent portal" title="Timetable" description="Every lesson this week, in Nairobi time." />
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <WeekNav weekKey={weekKey} basePath="/parent/timetable" params={{ child: searchParams.child }} />
          {links.length > 1 && (
            <FilterSelect
              param="child"
              label="Child"
              allLabel="All children"
              options={links.map((l) => ({ value: l.studentId, label: fullName(l.student.user) }))}
            />
          )}
        </div>
        <div className="p-3 sm:p-4">
          <WeekGrid weekKey={weekKey} sessions={sessions} />
        </div>
      </div>
    </>
  );
}
