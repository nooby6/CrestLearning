"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/validation";
import { isEnded, periodContaining, periodLabel, periodSummary, unpaidLessons, type PayPeriod } from "@/lib/payouts";
import { lockWallet, walletBalance } from "@/lib/wallet";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
};

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const MoneyInput = z.object({
  amount: z.number({ invalid_type_error: "Enter an amount" }).positive("Enter an amount above zero").max(100_000_000, "That amount is too large"),
  method: z.enum(["MPESA", "BANK_TRANSFER", "CARD", "CASH"]),
  reference: z.string().trim().max(80).optional(),
  on: dateKey,
  note: z.string().trim().max(300).optional(),
});

/** The office records money that has reached the school's payment account. */
export async function addToWallet(input: z.input<typeof MoneyInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = MoneyInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  const cents = Math.round(d.amount * 100);
  await prisma.walletEntry.create({
    data: { kind: "DEPOSIT", amount: cents, method: d.method, reference: d.reference || null, note: d.note || null, occurredAt: new Date(`${d.on}T12:00:00+03:00`), createdById: me.id },
  });
  refresh();
  return { ok: true, message: `${formatMoney(cents)} added to the wallet` };
}

/** Money moved out of the wallet for something other than teacher pay (for example, back to the bank). */
export async function takeFromWallet(input: z.input<typeof MoneyInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = MoneyInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  if (!d.note) return { ok: false, error: "Say why the money is being taken out." };
  const cents = Math.round(d.amount * 100);
  try {
    await prisma.$transaction(async (tx) => {
      await lockWallet(tx);
      const balance = await walletBalance(tx);
      if (cents > balance) throw new Error(`The wallet only holds ${formatMoney(balance)}.`);
      await tx.walletEntry.create({
        data: { kind: "WITHDRAWAL", amount: -cents, method: d.method, reference: d.reference || null, note: d.note, occurredAt: new Date(`${d.on}T12:00:00+03:00`), createdById: me.id },
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn’t take the money out." };
  }
  refresh();
  return { ok: true, message: `${formatMoney(cents)} taken out of the wallet` };
}

/**
 * Pays one teacher, from the wallet, for every held and unpaid lesson in the period. All or nothing:
 * the payment, its lessons and the wallet deduction are saved together, and only if the wallet can cover it.
 */
async function payTeacher(teacherId: string, name: string, period: PayPeriod, adminId: string) {
  return prisma.$transaction(async (tx) => {
    await lockWallet(tx);
    const lessons = await unpaidLessons(period, teacherId);
    const amount = lessons.reduce((a, l) => a + l.amount, 0);
    if (!lessons.length || amount <= 0) return 0;
    const balance = await walletBalance(tx);
    if (amount > balance) throw new Error(`The wallet holds ${formatMoney(balance)}, which isn’t enough to pay ${name} ${formatMoney(amount)}. Add ${formatMoney(amount - balance)} first.`);
    const payout = await tx.teacherPayout.create({
      data: {
        teacherId,
        periodStart: new Date(period.start),
        periodEnd: new Date(period.end),
        sessionsHeld: lessons.length,
        minutesHeld: lessons.reduce((a, l) => a + l.minutes, 0),
        amount,
        status: "PAID",
        method: "WALLET",
        paidAt: new Date(),
        confirmedById: adminId,
      },
    });
    await tx.teacherPayoutItem.createMany({ data: lessons.map((l) => ({ payoutId: payout.id, sessionId: l.id, minutes: l.minutes, amount: l.amount })) });
    await tx.walletEntry.create({
      data: { kind: "TEACHER_PAYMENT", amount: -amount, payoutId: payout.id, note: `${name} · ${periodLabel(period)}`, createdById: adminId },
    });
    return amount;
  });
}

const PayInput = z.object({ teacherId: z.string().min(1), periodStart: dateKey });

export async function payFromWallet(input: z.input<typeof PayInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = PayInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const period = periodContaining(p.data.periodStart);
  if (period.start !== p.data.periodStart) return { ok: false, error: "That isn’t the start of a pay period." };
  const teacher = await prisma.user.findUnique({ where: { id: p.data.teacherId }, select: { firstName: true, lastName: true, teacher: { select: { hourlyRate: true } } } });
  if (!teacher?.teacher) return { ok: false, error: "Teacher not found." };
  if (!teacher.teacher.hourlyRate) return { ok: false, error: "This teacher’s hourly rate isn’t set, so there’s nothing to pay. Set it on their profile first." };
  const name = `${teacher.firstName} ${teacher.lastName}`;
  try {
    const paid = await payTeacher(p.data.teacherId, name, period, me.id);
    if (!paid) return { ok: false, error: "Nothing is owed for this period. It may already have been paid." };
    refresh();
    return { ok: true, message: `${formatMoney(paid)} paid to ${name} from the wallet` };
  } catch (e) {
    return { ok: false, error: e instanceof Error && !e.message.includes("Unique constraint") ? e.message : "Some of these lessons were just paid. Refresh and check." };
  }
}

/** Pays everyone owed for an ended period, if the wallet can cover the whole amount. */
export async function payAllFromWallet(periodStart: string): Promise<ActionResult> {
  const me = await assertRole("admin");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { ok: false, error: "Choose a pay period." };
  const period = periodContaining(periodStart);
  if (!isEnded(period)) return { ok: false, error: "This period hasn’t ended yet. Pay teachers once it has." };
  const rows = (await periodSummary(period)).filter((r) => r.owed > 0 && r.hourlyRate > 0);
  if (!rows.length) return { ok: false, error: "Nobody is owed anything for this period." };
  const total = rows.reduce((a, r) => a + r.owed, 0);
  const balance = await walletBalance();
  if (total > balance) return { ok: false, error: `Paying everyone needs ${formatMoney(total)}, but the wallet holds ${formatMoney(balance)}. Add ${formatMoney(total - balance)} first.` };

  let paid = 0;
  let count = 0;
  const failed: string[] = [];
  for (const r of rows) {
    try {
      const amount = await payTeacher(r.teacherId, r.name, period, me.id);
      if (amount) {
        paid += amount;
        count++;
      }
    } catch {
      failed.push(r.name);
    }
  }
  refresh();
  if (failed.length) return { ok: false, error: `Paid ${count} ${count === 1 ? "teacher" : "teachers"} (${formatMoney(paid)}). Not paid: ${failed.join(", ")}. Refresh and try them again.` };
  return { ok: true, message: `${formatMoney(paid)} paid to ${count} ${count === 1 ? "teacher" : "teachers"} from the wallet` };
}

const DetailsInput = z
  .object({
    teacherId: z.string().min(1),
    method: z.enum(["MPESA", "BANK", ""]),
    phone: z.string().trim().max(20).optional(),
    bank: z.string().trim().max(80).optional(),
    accountName: z.string().trim().max(120).optional(),
    accountNumber: z.string().trim().max(40).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.method === "MPESA" && !/^(?:\+?254|0)?7\d{8}$|^(?:\+?254|0)?1\d{8}$/.test((d.phone ?? "").replace(/\s/g, "")))
      ctx.addIssue({ code: "custom", message: "Enter the teacher’s M-Pesa number, e.g. 0712 345 678" });
    if (d.method === "BANK" && (!d.bank || !d.accountName || !d.accountNumber)) ctx.addIssue({ code: "custom", message: "Add the bank, account name and account number" });
  });

/** Where a teacher's pay is sent. Visible to the office only. */
export async function saveTeacherPayoutDetails(input: z.input<typeof DetailsInput>): Promise<ActionResult> {
  await assertRole("admin");
  const p = DetailsInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  const phone = d.phone?.replace(/\s/g, "") || null;
  await prisma.teacher.update({
    where: { id: d.teacherId },
    data: {
      payoutMethod: d.method || null,
      payoutPhone: d.method === "MPESA" ? phone : null,
      payoutBank: d.method === "BANK" ? d.bank || null : null,
      payoutAccountName: d.method === "BANK" ? d.accountName || null : null,
      payoutAccountNumber: d.method === "BANK" ? d.accountNumber || null : null,
    },
  });
  refresh();
  return { ok: true, message: "Payment details saved" };
}
