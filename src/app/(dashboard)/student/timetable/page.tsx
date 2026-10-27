import { requireRole } from "@/lib/auth";
import { weekSessions } from "@/lib/timetable";
import { PageHeader } from "@/components/ui/primitives";
import { WeekGrid, WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Timetable" };

export default async function StudentTimetable({ searchParams }: { searchParams: { week?: string } }) {
  const me = await requireRole("student");
  const weekKey = resolveWeek(searchParams.week);
  const sessions = await weekSessions(weekKey, { studentId: me.id }, "student");
  return (
    <>
      <PageHeader eyebrow="Student portal" title="Timetable" description="Your week, in Nairobi time." />
      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <WeekNav weekKey={weekKey} basePath="/student/timetable" />
        </div>
        <div className="p-3 sm:p-4">
          <WeekGrid weekKey={weekKey} sessions={sessions} />
        </div>
      </div>
    </>
  );
}
