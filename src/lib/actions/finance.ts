"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/validation";
import { PAYMENT_INSTRUCTIONS_KEY, nextInvoiceNumber, recalcInvoice } from "@/lib/finance";
import { addDaysKey } from "@/lib/schedule";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/parent", "layout");
};
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const kes = (n: number) => Math.round(n * 100);

/* ------------------------------------------------------------------ invoices */

const InvoiceInput = z.object({
  studentId: z.string().min(1, "Choose a student"),
  billToId: z.string().optional(),
  periodStart: day,
  periodEnd: day,
  dueDate: day,
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Describe each line").max(200),
        quantity: z.number().int().min(1).max(1000),
        unitKes: z.number().min(0).max(10_000_000),
        enrollmentId: z.number().int().optional(),
      }),
    )
    .min(1, "Add at least one line"),
  discountKes: z.number().min(0).max(10_000_000).default(0),
  notes: z.string().trim().max(1000).optional(),
  issue: z.boolean().default(true),
});

export async function createInvoice(input: z.input<typeof InvoiceInput>): Promise<ActionResult<{ id: number }>> {
  await assertRole("admin");
  const p = InvoiceInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  if (d.periodEnd < d.periodStart) return { ok: false, error: "The period ends before it starts." };

  const student = await prisma.student.findUnique({
    where: { id: d.studentId },
    select: { id: true, guardians: { select: { parentId: true, isPrimary: true } } },
  });
  if (!student) return { ok: false, error: "Student not found." };
  const billToId = d.billToId && student.guardians.some((g) => g.parentId === d.billToId) ? d.billToId : student.guardians.find((g) => g.isPrimary)?.parentId ?? null;

  const lines = d.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitAmount: kes(l.unitKes), amount: kes(l.unitKes) * l.quantity, enrollmentId: l.enrollmentId ?? null }));
  const subtotal = lines.reduce((a, l) => a + l.amount, 0);
  const discount = Math.min(kes(d.discountKes), subtotal);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const inv = await prisma.$transaction(async (tx) =>
        tx.invoice.create({
          data: {
            number: await nextInvoiceNumber(tx),
            studentId: d.studentId,
            billToId,
            periodStart: new Date(d.periodStart),
            periodEnd: new Date(d.periodEnd),
            dueDate: new Date(d.dueDate),
            status: d.issue ? "ISSUED" : "DRAFT",
            issuedAt: d.issue ? new Date() : null,
            subtotal,
            discount,
            total: subtotal - discount,
            notes: d.notes || null,
            lines: { create: lines },
          },
        }),
      );
      refresh();
      return { ok: true, data: { id: inv.id }, message: d.issue ? `Invoice ${inv.number} issued — the parent can see it now` : `Draft ${inv.number} saved` };
    } catch (err) {
      if ((err as { code?: string }).code !== "P2002") throw err; // number clash: retry with the next number
    }
  }
  return { ok: false, error: "Couldn’t number the invoice. Please try again." };
}

export async function issueInvoice(id: number): Promise<ActionResult> {
  await assertRole("admin");
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv || inv.status !== "DRAFT") return { ok: false, error: "Only drafts can be issued." };
  await prisma.invoice.update({ where: { id }, data: { status: "ISSUED", issuedAt: new Date() } });
  refresh();
  return { ok: true, message: `Invoice ${inv.number} issued — the parent can see it now` };
}

export async function issueAllDrafts(): Promise<ActionResult> {
  await assertRole("admin");
  const { count } = await prisma.invoice.updateMany({ where: { status: "DRAFT" }, data: { status: "ISSUED", issuedAt: new Date() } });
  refresh();
  return { ok: true, message: count ? `${count} ${count === 1 ? "invoice" : "invoices"} issued` : "No drafts to issue" };
}

export async function voidInvoice(id: number): Promise<ActionResult> {
  await assertRole("admin");
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { payments: { where: { status: "SUCCEEDED" } } } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.payments.length) return { ok: false, error: "Remove the recorded payments first — a paid invoice can’t be voided." };
  if (inv.status === "DRAFT") {
    await prisma.invoice.delete({ where: { id } });
    refresh();
    return { ok: true, message: "Draft deleted" };
  }
  await prisma.invoice.update({ where: { id }, data: { status: "VOID" } });
  refresh();
  return { ok: true, message: `Invoice ${inv.number} voided` };
}

/* ------------------------------------------------------------------ payments */

const PaymentInput = z.object({
  amountKes: z.number().positive("Enter the amount paid").max(10_000_000),
  provider: z.enum(["MPESA", "BANK_TRANSFER", "CASH", "FLUTTERWAVE"]),
  receipt: z.string().trim().max(80).optional(),
  payerPhone: z.string().trim().max(20).optional(),
  paidOn: day,
  note: z.string().trim().max(500).optional(),
});

/** The office records a payment against an invoice; balance and status update for the parent straight away. */
export async function recordPayment(invoiceId: number, input: z.input<typeof PaymentInput>): Promise<ActionResult> {
  const me = await assertRole("admin");
  const p = PaymentInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const d = p.data;
  if (d.provider === "MPESA" && !d.receipt) return { ok: false, error: "Add the M-Pesa confirmation code." };
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv || inv.status === "VOID") return { ok: false, error: "This invoice can’t take payments." };
  const amount = kes(d.amountKes);
  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          invoiceId,
          amount,
          provider: d.provider,
          status: "SUCCEEDED",
          providerRef: d.receipt ? d.receipt.toUpperCase() : null,
          receipt: d.receipt ? d.receipt.toUpperCase() : null,
          payerPhone: d.payerPhone || null,
          note: d.note || null,
          paidAt: new Date(`${d.paidOn}T12:00:00+03:00`),
          recordedById: me.id,
        },
      });
      await recalcInvoice(tx, invoiceId);
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return { ok: false, error: "That receipt code has already been recorded." };
    throw err;
  }
  refresh();
  return { ok: true, message: `${formatMoney(amount)} recorded against ${inv.number}` };
}

export async function removePayment(paymentId: number): Promise<ActionResult> {
  await assertRole("admin");
  const pay = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!pay) return { ok: false, error: "Payment not found." };
  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    await recalcInvoice(tx, pay.invoiceId);
  });
  refresh();
  return { ok: true, message: `Payment of ${formatMoney(pay.amount)} removed` };
}

/* ------------------------------------------------------------------ fee plans */

const PlanInput = z.object({
  name: z.string().trim().min(2, "Name the plan").max(80),
  cycle: z.enum(["MONTHLY", "TERMLY", "PER_SESSION"]),
  amountKes: z.number().positive("Enter the amount").max(10_000_000),
});

/** One active fee plan per student; saving replaces the current one. */
export async function saveFeePlan(studentId: string, input: z.input<typeof PlanInput>): Promise<ActionResult> {
  await assertRole("admin");
  const p = PlanInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await prisma.$transaction([
    prisma.feePlan.updateMany({ where: { studentId, active: true }, data: { active: false, endsOn: new Date() } }),
    prisma.feePlan.create({ data: { studentId, name: p.data.name, cycle: p.data.cycle, amount: kes(p.data.amountKes) } }),
  ]);
  refresh();
  return { ok: true, message: "Fee plan saved" };
}

export async function endFeePlan(studentId: string): Promise<ActionResult> {
  await assertRole("admin");
  await prisma.feePlan.updateMany({ where: { studentId, active: true }, data: { active: false, endsOn: new Date() } });
  refresh();
  return { ok: true, message: "Fee plan ended" };
}

/** Drafts this month's invoices for every enrolled student on a monthly plan (skips ones already billed). */
export async function generateMonthlyInvoices(month: string, dueDay: number): Promise<ActionResult> {
  await assertRole("admin");
  if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, error: "Choose a month." };
  const start = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const end = addDaysKey(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, -1);
  const due = `${month}-${String(Math.min(Math.max(1, dueDay), 28)).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${start}T00:00:00Z`));

  const plans = await prisma.feePlan.findMany({
    where: { active: true, cycle: "MONTHLY", student: { user: { active: true }, enrollments: { some: { status: "ACTIVE" } } } },
    include: { student: { select: { guardians: { where: { isPrimary: true }, select: { parentId: true } } } } },
  });
  let created = 0;
  for (const plan of plans) {
    const exists = await prisma.invoice.count({ where: { studentId: plan.studentId, periodStart: new Date(start), status: { not: "VOID" } } });
    if (exists) continue;
    await prisma.$transaction(async (tx) => {
      await tx.invoice.create({
        data: {
          number: await nextInvoiceNumber(tx, y),
          studentId: plan.studentId,
          billToId: plan.student.guardians[0]?.parentId ?? null,
          feePlanId: plan.id,
          periodStart: new Date(start),
          periodEnd: new Date(end),
          dueDate: new Date(due),
          status: "DRAFT",
          subtotal: plan.amount,
          total: plan.amount,
          lines: { create: [{ description: `${plan.name} — ${label}`, quantity: 1, unitAmount: plan.amount, amount: plan.amount }] },
        },
      });
    });
    created++;
  }
  refresh();
  return {
    ok: true,
    message: created
      ? `${created} draft ${created === 1 ? "invoice" : "invoices"} created for ${label}. Review them, then issue.`
      : plans.length
        ? `Everyone on a monthly plan already has an invoice for ${label}.`
        : "No enrolled students have a monthly fee plan yet. Add one on a student’s enrollment page.",
  };
}

export async function savePaymentInstructions(text: string): Promise<ActionResult> {
  await assertRole("admin");
  const value = text.trim().slice(0, 1500);
  await prisma.setting.upsert({ where: { key: PAYMENT_INSTRUCTIONS_KEY }, update: { value }, create: { key: PAYMENT_INSTRUCTIONS_KEY, value } });
  refresh();
  return { ok: true, message: "Payment instructions saved" };
}
