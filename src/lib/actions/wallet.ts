"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/validation";
import { isEnded, periodContaining, periodLabel, periodSummary, unpaidLessons, type PayPeriod } from "@/lib/payouts";
import { lockWallet, walletBalance, walletProvider } from "@/lib/wallet";
import { IntaSendError, kenyanMsisdn, mpesaStkPush, sendMoney } from "@/lib/intasend";
import { syncWallet } from "@/lib/wallet-sync";

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
async function payTeacher(teacherId: string, name: string, period: PayPeriod, adminId: string): Promise<{ amount: number; sending: boolean }> {
  if (walletProvider().connected) return payTeacherThroughIntaSend(teacherId, name, period, adminId);
  const amount = await prisma.$transaction(async (tx) => {
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
  return { amount, sending: false };
}

/**
 * With IntaSend connected the money really moves: the payment is reserved in the portal first (so it can't be paid
 * twice), then sent to the teacher's M-Pesa or bank account. It shows as "sending" until IntaSend confirms it.
 */
async function payTeacherThroughIntaSend(teacherId: string, name: string, period: PayPeriod, adminId: string) {
  const t = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { payoutMethod: true, payoutPhone: true, payoutBankCode: true, payoutAccountName: true, payoutAccountNumber: true } });
  const phone = t?.payoutMethod === "MPESA" && t.payoutPhone ? kenyanMsisdn(t.payoutPhone) : null;
  const bank = t?.payoutMethod === "BANK" && t.payoutBankCode && t.payoutAccountNumber ? { code: t.payoutBankCode, account: t.payoutAccountNumber, holder: t.payoutAccountName || name } : null;
  if (!phone && !bank) throw new Error(`Add where ${name} is paid (M-Pesa number or bank account) on their profile first.`);

  const reserved = await prisma.$transaction(async (tx) => {
    await lockWallet(tx);
    const lessons = await unpaidLessons(period, teacherId);
    const amount = lessons.reduce((a, l) => a + l.amount, 0);
    if (!lessons.length || amount <= 0) return null;
    if (amount < 1_000) throw new Error("The amount is below IntaSend’s KES 10 minimum.");
    const balance = await walletBalance(tx);
    if (amount > balance) throw new Error(`The wallet holds ${formatMoney(balance)}, which isn’t enough to pay ${name} ${formatMoney(amount)}. Add ${formatMoney(amount - balance)} first.`);
    if (bank && amount < 10_000) throw new Error("Bank payments must be at least KES 100.");
    const payout = await tx.teacherPayout.create({
      data: {
        teacherId,
        periodStart: new Date(period.start),
        periodEnd: new Date(period.end),
        sessionsHeld: lessons.length,
        minutesHeld: lessons.reduce((a, l) => a + l.minutes, 0),
        amount,
        status: "APPROVED",
        method: "WALLET",
        confirmedById: adminId,
      },
    });
    await tx.teacherPayoutItem.createMany({ data: lessons.map((l) => ({ payoutId: payout.id, sessionId: l.id, minutes: l.minutes, amount: l.amount })) });
    const entry = await tx.walletEntry.create({
      data: { kind: "TEACHER_PAYMENT", amount: -amount, payoutId: payout.id, status: "PENDING", provider: "intasend", method: phone ? "MPESA" : "BANK_TRANSFER", note: `${name} · ${periodLabel(period)}`, createdById: adminId },
    });
    return { amount, payoutId: payout.id, entryId: entry.id };
  });
  if (!reserved) return { amount: 0, sending: false };

  try {
    const narrative = `Crest pay ${periodLabel(period)}`.slice(0, 60);
    // M-Pesa and PesaLink move whole shillings.
    const amountKes = Math.round(reserved.amount / 100);
    const r = phone
      ? await sendMoney({ kind: "MPESA", phone, name, amountKes, narrative })
      : await sendMoney({ kind: "BANK", account: bank!.account, bankCode: bank!.code, name: bank!.holder, amountKes, narrative });
    await prisma.walletEntry.update({ where: { id: reserved.entryId }, data: { providerRef: r.trackingId } });
  } catch (err) {
    // Nothing was sent: undo the reservation so the lessons show as owed again.
    await prisma.$transaction([
      prisma.walletEntry.update({ where: { id: reserved.entryId }, data: { status: "FAILED", note: `${name} · not sent: ${err instanceof Error ? err.message : "error"}`.slice(0, 300) } }),
      prisma.teacherPayout.delete({ where: { id: reserved.payoutId } }),
    ]);
    throw new Error(err instanceof IntaSendError ? `IntaSend: ${err.message}` : "Couldn’t reach IntaSend. Nothing was sent; try again.");
  }
  return { amount: reserved.amount, sending: true };
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
    const r = await payTeacher(p.data.teacherId, name, period, me.id);
    if (!r.amount) return { ok: false, error: "Nothing is owed for this period. It may already have been paid." };
    refresh();
    return { ok: true, message: r.sending ? `Sending ${formatMoney(r.amount)} to ${name} through IntaSend` : `${formatMoney(r.amount)} paid to ${name} from the wallet` };
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
      const res = await payTeacher(r.teacherId, r.name, period, me.id);
      if (res.amount) {
        paid += res.amount;
        count++;
      }
    } catch (e) {
      failed.push(`${r.name} (${e instanceof Error ? e.message : "error"})`);
    }
  }
  refresh();
  if (failed.length) return { ok: false, error: `Paid ${count} ${count === 1 ? "teacher" : "teachers"} (${formatMoney(paid)}). Not paid: ${failed.join(", ")}. Refresh and try them again.` };
  return {
    ok: true,
    message: walletProvider().connected
      ? `Sending ${formatMoney(paid)} to ${count} ${count === 1 ? "teacher" : "teachers"} through IntaSend`
      : `${formatMoney(paid)} paid to ${count} ${count === 1 ? "teacher" : "teachers"} from the wallet`,
  };
}

const DetailsInput = z
  .object({
    teacherId: z.string().min(1),
    method: z.enum(["MPESA", "BANK", ""]),
    phone: z.string().trim().max(20).optional(),
    bank: z.string().trim().max(80).optional(),
    accountName: z.string().trim().max(120).optional(),
    accountNumber: z.string().trim().max(40).optional(),
    bankCode: z.string().trim().max(10).optional(),
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
      payoutBankCode: d.method === "BANK" ? d.bankCode || null : null,
    },
  });
  refresh();
  return { ok: true, message: "Payment details saved" };
}

const TopUpInput = z.object({
  amount: z.number({ invalid_type_error: "Enter an amount" }).int("Use whole shillings").min(10, "The minimum is KES 10").max(250_000, "M-Pesa allows up to KES 250,000 per payment"),
  phone: z.string().trim().min(9, "Enter the M-Pesa number that will pay"),
});

/** Sends an M-Pesa prompt to the phone; once paid, the money is in the school's IntaSend account and the wallet. */
export async function topUpWithMpesa(input: z.input<typeof TopUpInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  if (!walletProvider().connected) return { ok: false, error: "IntaSend isn’t connected yet." };
  const p = TopUpInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const phone = kenyanMsisdn(p.data.phone);
  if (!phone) return { ok: false, error: "Enter a Kenyan M-Pesa number, e.g. 0712 345 678" };
  const entry = await prisma.walletEntry.create({
    data: { kind: "DEPOSIT", amount: p.data.amount * 100, method: "MPESA", status: "PENDING", provider: "intasend", note: `M-Pesa top-up from ${phone}`, createdById: me.id },
  });
  try {
    const r = await mpesaStkPush({ amountKes: p.data.amount, phone, apiRef: `crest-wallet-${entry.id}`, narrative: "Crest wallet top-up" });
    await prisma.walletEntry.update({ where: { id: entry.id }, data: { providerRef: r.invoiceId } });
  } catch (err) {
    await prisma.walletEntry.update({ where: { id: entry.id }, data: { status: "FAILED" } });
    return { ok: false, error: err instanceof IntaSendError ? `IntaSend: ${err.message}` : "Couldn’t reach IntaSend. Try again." };
  }
  refresh();
  return { ok: true, message: `M-Pesa prompt sent to ${phone}. The money shows here once it’s paid.` };
}

/** "Check now": settles anything IntaSend has finished. */
export async function checkWalletStatus(): Promise<ActionResult> {
  await assertRole("admin");
  const r = await syncWallet({ force: true });
  refresh();
  return { ok: true, message: r.settled ? `${r.settled} ${r.settled === 1 ? "payment" : "payments"} updated` : "Nothing new from IntaSend yet" };
}
