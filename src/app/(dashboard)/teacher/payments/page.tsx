import clsx from "clsx";
import { Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { formatTime } from "@/lib/schedule";
import { dayLabel, methodLabel, periodContaining, periodLabel, teacherHistory, type TeacherPeriod } from "@/lib/payouts";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Payments" };

const STATUS: Record<TeacherPeriod["status"], { label: string; tone: "green" | "amber" | "rose" | "slate" | "navy" }> = {
  paid: { label: "Paid", tone: "green" },
  due: { label: "Payment due", tone: "amber" },
  overdue: { label: "Payment due", tone: "rose" },
  "in-progress": { label: "In progress", tone: "navy" },
  none: { label: "No lessons", tone: "slate" },
};

/** What the teacher is owed and has been paid — lessons and amounts only (hours are for the office). */
export default async function TeacherPaymentsPage() {
  const me = await requireRole("teacher");
  const history = await teacherHistory(me.id, 10);
  const current = periodContaining();
  const now = history.find((h) => h.period.start === current.start);
  const due = history.filter((h) => h.period.start !== current.start && h.summary.owed > 0);
  const owedTotal = due.reduce((a, h) => a + h.summary.owed, 0);
  const currency = history[0]?.summary.currency ?? "KES";

  return (
    <>
      <PageHeader
        eyebrow="Teacher portal"
        title="Payments"
        description="You’re paid every two weeks for the lessons you hold. Payment is due on the Friday after each pay period ends."
      />

      <div className="mb-6 grid border border-line bg-white sm:grid-cols-2">
        <div className={clsx("border-l-[3px] px-5 py-4", owedTotal ? "border-l-amber-500" : "border-l-emerald-600")}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Payment due</p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tabular-nums text-navy-900">{formatMoney(owedTotal, currency)}</p>
          <p className="mt-2 text-xs text-navy-500">
            {due.length
              ? `For ${due.map((h) => periodLabel(h.period)).join(" and ")} · due ${dayLabel(due[due.length - 1].period.due, { weekday: "short", day: "numeric", month: "short" })}`
              : "You’re fully paid up."}
          </p>
        </div>
        <div className="border-t border-line px-5 py-4 sm:border-l sm:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">This pay period so far</p>
          <p className="mt-1.5 font-display text-[28px] font-semibold leading-none tabular-nums text-navy-900">{formatMoney(now?.summary.owed ?? 0, currency)}</p>
          <p className="mt-2 text-xs text-navy-500">
            {now?.summary.lessons.length ?? 0} {(now?.summary.lessons.length ?? 0) === 1 ? "lesson" : "lessons"} held · {periodLabel(current)} · paid by{" "}
            {dayLabel(current.due, { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState icon={Wallet} title="No payments yet">
          Once you start holding lessons, what you’re owed appears here.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-2.5">Pay period</th>
                <th className="px-3 py-2.5 text-right">Lessons</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            {history.map(({ period, summary: s }) => (
              <tbody key={period.start} className="border-b border-line last:border-b-0">
                <tr className="align-top">
                  <td className="px-5 py-3">
                    <p className="font-medium text-navy-900">{periodLabel(period)}</p>
                    <p className="text-xs text-navy-400">Due {dayLabel(period.due, { weekday: "short", day: "numeric", month: "short" })}</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.lessons.length}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoney(s.earned, s.currency)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                    {s.payouts.map((x) => (
                      <p key={x.id} className="mt-1 text-xs text-navy-600">
                        {formatMoney(x.amount, s.currency)} paid {x.paidAt ? formatDate(x.paidAt, { day: "numeric", month: "short", year: undefined }) : ""} · {methodLabel(x.method)}
                        {x.reference && <span className="font-mono"> · {x.reference}</span>}
                      </p>
                    ))}
                    {s.owed > 0 && s.paid > 0 && <p className="mt-1 text-xs font-medium text-amber-700">{formatMoney(s.owed, s.currency)} still to be paid</p>}
                  </td>
                </tr>
                {s.lessons.length > 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 pb-3">
                      <details className="border border-line">
                        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-navy-600 hover:bg-ivory">Lessons ({s.lessons.length})</summary>
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-line">
                            {s.lessons.map((l) => (
                              <tr key={l.id}>
                                <td className="px-3 py-1.5 tabular-nums">
                                  {formatDate(l.startsAt, { weekday: "short", day: "numeric", month: "short", year: undefined })} · {formatTime(l.startsAt)}
                                </td>
                                <td className="px-3 py-1.5">
                                  {l.student} · {l.subject}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(l.amount, s.currency)}</td>
                                <td className="w-16 px-3 py-1.5 text-right text-navy-400">{l.paid ? "Paid" : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    </td>
                  </tr>
                )}
              </tbody>
            ))}
          </table>
          <p className="border-t border-line px-5 py-3 text-xs text-navy-400">
            Only lessons you attended count. If a lesson is missing, ask the office to correct its attendance.
          </p>
        </div>
      )}
    </>
  );
}
