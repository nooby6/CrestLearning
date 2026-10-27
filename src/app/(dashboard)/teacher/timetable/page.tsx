import { requireRole } from "@/lib/auth";
import { weekSessions } from "@/lib/timetable";
import { hoursLabel } from "@/lib/schedule";
import { PageHeader } from "@/components/ui/primitives";
import { WeekGrid, WeekNav, resolveWeek } from "@/components/schedule/WeekGrid";

export const metadata = { title: "Timetable" };

export default async function TeacherTimetable({ searchParams }: { searchParams: { week?: string } }) {
  const me = await requireRole("teacher");
  const weekKey = resolveWeek(searchParams.week);
  const sessions = await weekSessions(weekKey, { teacherId: me.id }, "teacher", (s) => `/teacher/sessions/${s.id}`);
  const live = sessions.filter((s) => s.status === "SCHEDULED" || s.status === "HELD");
  const mins = live.reduce((a, s) => a + (+s.endsAt - +s.startsAt) / 60000, 0);

  return (
    <>
      <PageHeader eyebrow="Teacher portal" title="Timetable" description={`${live.length} sessions · ${hoursLabel(mins)} this week, in Nairobi time.`} />
      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <WeekNav weekKey={weekKey} basePath="/teacher/timetable" />
        </div>
        <div className="p-3 sm:p-4">
          <WeekGrid weekKey={weekKey} sessions={sessions} />
        </div>
      </div>
    </>
  );
}
