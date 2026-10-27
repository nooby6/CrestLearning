import { formatDate, fullName } from "@/lib/format";
import { curriculumLabel } from "@/lib/roles";
import { EFFORT_LABEL, type WeekDigest } from "@/lib/reports";
import { Avatar } from "@/components/ui/primitives";
import { tintFor } from "@/components/schedule/WeekGrid";
import { WeekSessions } from "./WeekSessions";

/** One student's weekly report: attendance summary, then each subject's teacher report and lessons. */
export function StudentWeekReport({
  student,
  items,
}: {
  student: { id: string; firstName: string; lastName: string; avatarUrl: string | null; curriculum: string | null; levelName?: string | null };
  items: WeekDigest[];
}) {
  const counted = items.reduce((a, d) => a + d.countedForAttendance, 0);
  const attended = items.reduce((a, d) => a + d.attended, 0);
  const held = items.reduce((a, d) => a + d.held, 0);
  const written = items.filter((d) => d.report).length;

  return (
    <section className="card overflow-hidden break-inside-avoid print:shadow-none">
      <header className="flex flex-wrap items-center gap-4 border-b border-line bg-gradient-to-r from-navy-50/70 to-white px-5 py-4">
        <Avatar person={student} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold text-navy-900">{fullName(student)}</h2>
          <p className="text-sm text-navy-500">
            {[curriculumLabel(student.curriculum), student.levelName].filter((x) => x && x !== "—").join(" · ") || "—"}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 text-center">
          <Stat label="Lessons held" value={held} />
          <Stat label="Attendance" value={counted ? `${Math.round((attended / counted) * 100)}%` : "—"} hint={counted ? `${attended} of ${counted}` : undefined} />
          <Stat label="Reports" value={`${written}/${items.length}`} />
        </dl>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-navy-400">No subjects this week.</p>
      ) : (
        <div className="divide-y divide-line">
          {items.map((d) => {
            const e = d.enrollment;
            const r = d.report;
            return (
              <article key={e.id} className="grid gap-6 px-5 py-5 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`h-5 w-1 rounded-full border-l-[3px] ${tintFor(e.subject.code)}`} />
                    <h3 className="font-display text-base font-semibold text-navy-900">{e.subject.name}</h3>
                    <span className="text-sm text-navy-400">· {fullName(e.teacher.user)}</span>
                  </div>
                  {r ? (
                    <div className="space-y-3 text-sm">
                      <p className="whitespace-pre-line leading-relaxed text-navy-800">{r.summary}</p>
                      {r.strengths && (
                        <p className="text-navy-700">
                          <span className="font-semibold text-navy-900">Strengths: </span>
                          {r.strengths}
                        </p>
                      )}
                      {r.nextSteps && (
                        <p className="text-navy-700">
                          <span className="font-semibold text-navy-900">Focus for next week: </span>
                          {r.nextSteps}
                        </p>
                      )}
                      {r.effort && (
                        <p className="flex items-center gap-2 text-xs text-navy-500">
                          Effort and engagement
                          <span className="flex gap-0.5" aria-label={`${r.effort} of 5`}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <span key={i} className={`h-1.5 w-4 rounded-full ${i <= r.effort! ? "bg-gold-500" : "bg-navy-100"}`} />
                            ))}
                          </span>
                          <span className="font-medium text-navy-700">{EFFORT_LABEL[r.effort]}</span>
                        </p>
                      )}
                      <p className="text-[11px] text-navy-300">Submitted {formatDate(r.updatedAt, { weekday: "short", year: undefined })}</p>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-line px-3 py-3 text-sm text-navy-400">
                      The teacher’s report for this week is not available yet.
                    </p>
                  )}
                </div>
                <div className="lg:border-l lg:border-line lg:pl-6">
                  <p className="eyebrow mb-3">Lessons and topics covered</p>
                  <WeekSessions sessions={d.sessions} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <dt className="text-[11px] text-navy-400">{label}</dt>
      <dd className="font-display text-lg font-semibold tabular-nums text-navy-900">{value}</dd>
      {hint && <dd className="text-[10px] text-navy-300">{hint}</dd>}
    </div>
  );
}
