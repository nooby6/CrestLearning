import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { formatTime, hoursLabel } from "@/lib/schedule";
import { dayLabel as day, isEnded, lastEndedPeriod, methodLabel, periodContaining, periodLabel, periodSummary, shiftPeriod, type PayPeriod, type TeacherPeriod } from "@/lib/payouts";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { ConfirmPayout, UndoPayout } from "@/components/payouts/PayoutActions";

export const metadata = { title: "Teacher payments" };

const STATUS: Record<TeacherPeriod["status"], { label: string; tone: "green" | "amber" | "rose" | "slate" | "navy" }> = {
  paid: { label: "Paid", tone: "green" },
  due: { label: "Due", tone: "amber" },
  overdue: { label: "Overdue", tone: "rose" },
  "in-progress": { label: "In progress", tone: "navy" },
  none: { label: "—", tone: "slate" },
};

export default async function PaymentsPage({ searchParams }: { searchParams: { period?: string } }) {
  await requireRole("admin");
  const period = searchParams.period && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.period) ? periodContaining(searchParams.period) : lastEndedPeriod();
  const current = periodContaining();
  const rows = await periodSummary(period);
  const ended = isEnded(period);

  const totals = {
    owed: rows.reduce((a, r) => a + r.owed, 0),
    paid: rows.reduce((a, r) => a + r.paid, 0),
    lessons: rows.reduce((a, r) => a + r.lessons.length, 0),
    minutes: rows.reduce((a, r) => a + r.minutes, 0),
  };
  const href = (p: PayPeriod) => `/admin/payments?period=${p.start}`;
  const prev = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Teacher payments"
        description="Teachers are paid every two weeks for the lessons they held, at their hourly rate. Confirm each payment once it’s made — the teacher sees it straight away."
      />

      <div className="mb-6 flex flex-col border border-line bg-white sm:flex-row sm:items-stretch">
        <Link href={href(prev)} className="flex items-center gap-1 border-b border-line px-4 py-3 text-sm text-navy-600 hover:bg-ivory sm:border-b-0 sm:border-r">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Link>
        <div className="flex flex-1 flex-col justify-center px-5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">Pay period</p>
          <p className="font-display text-base font-semibold text-navy-900">
            {periodLabel(period)}
            <span className="ml-3 align-middle">
              {!ended ? <Badge tone="navy">In progress</Badge> : <Badge tone="slate">Ended</Badge>}
            </span>
          </p>
          <p className="text-xs text-navy-500">Payment due {day(period.due, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        {period.start !== current.start && (
          <Link href={href(current)} className="flex items-center border-t border-line px-4 py-3 text-sm text-navy-600 hover:bg-ivory sm:border-l sm:border-t-0">
            Current period
          </Link>
        )}
        <Link href={href(next)} className="flex items-center justify-end gap-1 border-t border-line px-4 py-3 text-sm text-navy-600 hover:bg-ivory sm:border-l sm:border-t-0">
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <dl className="mb-6 grid grid-cols-2 border border-line bg-white sm:grid-cols-4">
        {[
          { label: ended ? "Owed" : "Owed so far", value: formatMoney(totals.owed), accent: totals.owed > 0 },
          { label: "Paid", value: formatMoney(totals.paid) },
          { label: "Lessons held", value: totals.lessons },
          { label: "Hours taught", value: hoursLabel(totals.minutes) },
        ].map((x, i) => (
          <div key={x.label} className={clsx("px-5 py-4", i % 2 === 1 && "border-l border-line", i >= 2 && "border-t border-line sm:border-t-0", i === 2 && "sm:border-l")}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{x.label}</dt>
            <dd className={clsx("mt-1 font-display text-2xl font-semibold tabular-nums", x.accent ? "text-amber-700" : "text-navy-900")}>{x.value}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <EmptyState icon={Wallet} title="No lessons held in this period">
          Pay is calculated from lessons the teacher attended. Nothing was held between {periodLabel(period)}.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-2.5">Teacher</th>
                <th className="px-3 py-2.5 text-right">Lessons</th>
                <th className="px-3 py-2.5 text-right">Hours</th>
                <th className="hidden px-3 py-2.5 text-right md:table-cell">Rate / h</th>
                <th className="px-3 py-2.5 text-right">Earned</th>
                <th className="hidden px-3 py-2.5 text-right md:table-cell">Paid</th>
                <th className="px-3 py-2.5 text-right">Owed</th>
                <th className="px-5 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            {rows.map((r) => (
              <tbody key={r.teacherId} className="border-b border-line last:border-b-0">
                <tr className="align-top">
                  <td className="px-5 py-3">
                    <Link href={`/admin/people/${r.teacherId}`} className="font-medium text-navy-900 hover:underline hover:underline-offset-4">
                      {r.name}
                    </Link>
                    {r.hourlyRate === 0 && <p className="text-xs font-medium text-rose-700">Hourly rate not set</p>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.lessons.length}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{hoursLabel(r.minutes)}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-navy-600 md:table-cell">{r.hourlyRate ? formatMoney(r.hourlyRate, r.currency) : "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(r.earned, r.currency)}</td>
                  <td className="hidden px-3 py-3 text-right tabular-nums text-emerald-700 md:table-cell">{r.paid ? formatMoney(r.paid, r.currency) : "—"}</td>
                  <td className={clsx("px-3 py-3 text-right font-semibold tabular-nums", r.owed ? "text-navy-900" : "text-navy-300")}>{formatMoney(r.owed, r.currency)}</td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="px-5 pb-4">
                    <div className="flex flex-col gap-3">
                      {r.payouts.map((x) => (
                        <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-l-[3px] border-emerald-600 bg-emerald-50/60 px-3 py-2 text-xs text-navy-700">
                          <span className="font-semibold text-emerald-800">Paid {formatMoney(x.amount, r.currency)}</span>
                          <span>{x.paidAt ? formatDate(x.paidAt, { day: "numeric", month: "short", year: "numeric" }) : ""}</span>
                          <span>{methodLabel(x.method)}</span>
                          {x.reference && <span className="font-mono">{x.reference}</span>}
                          <span>
                            {x.sessionsHeld} {x.sessionsHeld === 1 ? "lesson" : "lessons"}
                          </span>
                          {x.confirmedBy && <span className="text-navy-400">confirmed by {x.confirmedBy}</span>}
                          <span className="ml-auto">
                            <UndoPayout id={x.id} amount={formatMoney(x.amount, r.currency)} />
                          </span>
                        </div>
                      ))}
                      {r.owed > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-navy-500">
                            {r.unpaidLessons} unpaid {r.unpaidLessons === 1 ? "lesson" : "lessons"}
                            {!ended && " so far — the period hasn’t ended yet"}
                          </p>
                          <ConfirmPayout teacherId={r.teacherId} periodStart={period.start} amount={formatMoney(r.owed, r.currency)} teacherName={r.name} />
                        </div>
                      )}
                      <details className="group border border-line">
                        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-navy-600 hover:bg-ivory">
                          Lessons in this period ({r.lessons.length})
                        </summary>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="table-head">
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Student · subject</th>
                              <th className="px-3 py-2 text-right">Hours</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-right">Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {r.lessons.map((l) => (
                              <tr key={l.id}>
                                <td className="px-3 py-1.5 tabular-nums">
                                  <Link href={`/admin/sessions/${l.id}`} className="hover:underline">
                                    {formatDate(l.startsAt, { weekday: "short", day: "numeric", month: "short", year: undefined })} · {formatTime(l.startsAt)}
                                  </Link>
                                </td>
                                <td className="px-3 py-1.5">
                                  {l.student} · {l.subject}
                                </td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{hoursLabel(l.minutes)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(l.amount, r.currency)}</td>
                                <td className="px-3 py-1.5 text-right">{l.paid ? "✓" : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    </div>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>
      )}
    </>
  );
}
