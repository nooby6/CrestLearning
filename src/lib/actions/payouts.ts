"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/validation";
import { periodContaining, unpaidLessons } from "@/lib/payouts";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
};

const ConfirmInput = z.object({
  teacherId: z.string().min(1),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["MPESA", "BANK_TRANSFER", "CASH"]),
  reference: z.string().trim().max(80).optional(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date it was paid"),
  note: z.string().trim().max(500).optional(),
});

/**
 * The office confirms it has paid a teacher for a period. Every held, unpaid lesson in the period is
 * linked to this payment (so it can't be paid twice), and the teacher sees it as paid straight away.
 */
export async function confirmPayout(input: z.input<typeof ConfirmInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = ConfirmInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  if (d.method === "MPESA" && !d.reference) return { ok: false, error: "Add the M-Pesa confirmation code." };

  const period = periodContaining(d.periodStart);
  if (period.start !== d.periodStart) return { ok: false, error: "That isn’t the start of a pay period." };
  const lessons = await unpaidLessons(period, d.teacherId);
  if (!lessons.length) return { ok: false, error: "Nothing is owed for this period — it may already have been confirmed." };
  const amount = lessons.reduce((a, l) => a + l.amount, 0);
  if (amount <= 0) return { ok: false, error: "This teacher’s hourly rate isn’t set, so the amount is zero. Set the rate on their profile first." };

  try {
    await prisma.$transaction(async (tx) => {
      const payout = await tx.teacherPayout.create({
        data: {
          teacherId: d.teacherId,
          periodStart: new Date(period.start),
          periodEnd: new Date(period.end),
          sessionsHeld: lessons.length,
          minutesHeld: lessons.reduce((a, l) => a + l.minutes, 0),
          amount,
          status: "PAID",
          method: d.method,
          reference: d.reference || null,
          note: d.note || null,
          paidAt: new Date(`${d.paidOn}T09:00:00+03:00`),
          confirmedById: me.id,
        },
      });
      // sessionId is unique on payout items: a lesson paid by someone else meanwhile makes this fail and roll back.
      await tx.teacherPayoutItem.createMany({ data: lessons.map((l) => ({ payoutId: payout.id, sessionId: l.id, minutes: l.minutes, amount: l.amount })) });
    });
  } catch (err) {
    console.error("[confirmPayout]", err);
    return { ok: false, error: "Some of these lessons were just paid by someone else. Refresh and check the amount." };
  }
  refresh();
  return { ok: true, message: `Payment of ${formatMoney(amount)} confirmed — the teacher can see it now.` };
}

/** Reverses a confirmation made in error. The lessons become owed again. */
export async function undoPayout(payoutId: number): Promise<ActionResult> {
  await assertRole("admin");
  const x = await prisma.teacherPayout.findUnique({ where: { id: payoutId } });
  if (!x) return { ok: false, error: "That payment no longer exists." };
  await prisma.teacherPayout.delete({ where: { id: payoutId } }); // items cascade
  refresh();
  return { ok: true, message: `Confirmation of ${formatMoney(x.amount)} removed. Those lessons show as owed again.` };
}
