import "server-only";
import prisma from "./prisma";
import { addDaysKey, dateKey, keyToUtcStart } from "./schedule";

/**
 * Teacher pay: every two weeks, from lessons actually HELD (the teacher attended), at the teacher's
 * hourly rate (or the subject's own rate where the office set one).
 *
 * Pay periods are fixed fortnights, Monday to Sunday, counted from PAY_ANCHOR. Payment is due on the
 * Friday after a period ends. A lesson is paid once: confirming a payment links its lessons to that
 * payout, so a lesson recorded late shows up as still owed and can be paid separately.
 *
 * Hours are shown to the office only; teachers see lessons and amounts.
 */
export const PAY_ANCHOR = "2026-01-05"; // a Monday
export const PAY_PERIOD_DAYS = 14;
export const PAY_DUE_AFTER_END_DAYS = 5; // Sunday → Friday

export type PayPeriod = { start: string; end: string; due: string };

const dayIndex = (key: string) => Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${PAY_ANCHOR}T00:00:00Z`)) / 86_400_000);

export function periodContaining(key: string = dateKey(new Date())): PayPeriod {
  const n = Math.floor(dayIndex(key) / PAY_PERIOD_DAYS);
  const start = addDaysKey(PAY_ANCHOR, n * PAY_PERIOD_DAYS);
  const end = addDaysKey(start, PAY_PERIOD_DAYS - 1);
  return { start, end, due: addDaysKey(end, PAY_DUE_AFTER_END_DAYS) };
}

export const shiftPeriod = (p: PayPeriod, by: number) => periodContaining(addDaysKey(p.start, by * PAY_PERIOD_DAYS));

/** The most recent period that has finished — the one normally being paid. */
export const lastEndedPeriod = () => shiftPeriod(periodContaining(), -1);

export const isEnded = (p: PayPeriod) => dateKey(new Date()) > p.end;

export const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("en-KE", { ...opts, timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));

/** "13 Oct – 26 Oct 2026" */
export const periodLabel = (p: PayPeriod) => `${dayLabel(p.start)} – ${dayLabel(p.end, { day: "numeric", month: "short", year: "numeric" })}`;

/* ------------------------------------------------------------------ lessons and amounts */

export type PaidLesson = {
  id: number;
  startsAt: Date;
  minutes: number;
  rate: number; // minor units per hour
  amount: number; // minor units
  subject: string;
  student: string;
  teacherId: string;
  paid: boolean;
};

async function heldLessons(p: PayPeriod, teacherId?: string): Promise<PaidLesson[]> {
  const rows = await prisma.sessionInstance.findMany({
    where: {
      status: "HELD",
      startsAt: { gte: keyToUtcStart(p.start), lt: keyToUtcStart(addDaysKey(p.end, 1)) },
      ...(teacherId ? { enrollment: { teacherId } } : {}),
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      payoutItem: { select: { id: true } },
      enrollment: {
        select: {
          teacherId: true,
          teacherHourlyRate: true,
          teacher: { select: { hourlyRate: true } },
          subject: { select: { name: true } },
          student: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((s) => {
    const minutes = Math.max(0, Math.round((+s.endsAt - +s.startsAt) / 60_000));
    const rate = s.enrollment.teacherHourlyRate ?? s.enrollment.teacher.hourlyRate;
    return {
      id: s.id,
      startsAt: s.startsAt,
      minutes,
      rate,
      amount: Math.round((minutes * rate) / 60),
      subject: s.enrollment.subject.name,
      student: `${s.enrollment.student.user.firstName} ${s.enrollment.student.user.lastName}`,
      teacherId: s.enrollment.teacherId,
      paid: !!s.payoutItem,
    };
  });
}

export type TeacherPeriod = {
  teacherId: string;
  name: string;
  currency: string;
  hourlyRate: number;
  lessons: PaidLesson[];
  minutes: number;
  earned: number;
  paid: number;
  owed: number;
  unpaidLessons: number;
  payouts: { id: number; amount: number; sessionsHeld: number; method: string | null; reference: string | null; paidAt: Date | null; confirmedBy: string | null }[];
  status: "none" | "in-progress" | "due" | "overdue" | "paid";
};

function statusFor(p: PayPeriod, owed: number, paid: number, lessons: number): TeacherPeriod["status"] {
  if (!lessons && !paid) return "none";
  if (owed <= 0) return "paid";
  if (!isEnded(p)) return "in-progress";
  return dateKey(new Date()) > p.due ? "overdue" : "due";
}

/** Every teacher with lessons or payments in a period (or just one teacher). */
export async function periodSummary(p: PayPeriod, teacherId?: string): Promise<TeacherPeriod[]> {
  const [lessons, payouts, teachers] = await Promise.all([
    heldLessons(p, teacherId),
    prisma.teacherPayout.findMany({
      where: { periodStart: new Date(p.start), status: "PAID", ...(teacherId ? { teacherId } : {}) },
      include: { confirmedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { paidAt: "asc" },
    }),
    prisma.teacher.findMany({
      where: teacherId ? { id: teacherId } : {},
      select: { id: true, hourlyRate: true, currency: true, user: { select: { firstName: true, lastName: true, active: true } } },
    }),
  ]);
  return teachers
    .map((t) => {
      const mine = lessons.filter((l) => l.teacherId === t.id);
      const pays = payouts.filter((x) => x.teacherId === t.id);
      const paid = pays.reduce((a, x) => a + x.amount, 0);
      const owed = mine.filter((l) => !l.paid).reduce((a, l) => a + l.amount, 0);
      return {
        teacherId: t.id,
        name: `${t.user.firstName} ${t.user.lastName}`,
        currency: t.currency,
        hourlyRate: t.hourlyRate,
        lessons: mine,
        minutes: mine.reduce((a, l) => a + l.minutes, 0),
        earned: mine.reduce((a, l) => a + l.amount, 0),
        paid,
        owed,
        unpaidLessons: mine.filter((l) => !l.paid).length,
        payouts: pays.map((x) => ({
          id: x.id,
          amount: x.amount,
          sessionsHeld: x.sessionsHeld,
          method: x.method,
          reference: x.reference,
          paidAt: x.paidAt,
          confirmedBy: x.confirmedBy ? `${x.confirmedBy.firstName} ${x.confirmedBy.lastName}` : null,
        })),
        status: statusFor(p, owed, paid, mine.length),
      } satisfies TeacherPeriod;
    })
    .filter((t) => teacherId || t.status !== "none")
    .sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}

/** A teacher's recent periods, newest first (current period included). */
export async function teacherHistory(teacherId: string, count = 8) {
  const current = periodContaining();
  const periods = Array.from({ length: count }, (_, i) => shiftPeriod(current, -i));
  const rows = await Promise.all(periods.map(async (p) => ({ period: p, summary: (await periodSummary(p, teacherId))[0] })));
  return rows.filter((r) => r.summary && (r.summary.status !== "none" || r.period.start === current.start));
}

/** Lessons a confirmation would pay: held in the period and not yet paid. */
export async function unpaidLessons(p: PayPeriod, teacherId: string) {
  return (await heldLessons(p, teacherId)).filter((l) => !l.paid);
}

export const PAYMENT_METHODS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
] as const;

export const methodLabel = (m: string | null) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? (m ? m : "—");
