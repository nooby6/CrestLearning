import "server-only";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import prisma from "./prisma";
import { dateKey, dbDateKey } from "./schedule";

/**
 * Fees: invoices per student (billed to a parent), paid in one or more payments recorded by the office.
 * Amounts are stored in minor units (cents); the UI works in shillings.
 */

export type DisplayStatus = InvoiceStatus | "OVERDUE";

export const balanceOf = (inv: { total: number; amountPaid: number }) => Math.max(0, inv.total - inv.amountPaid);

/** Issued or part-paid invoices past their due date read as "Overdue". */
export function displayStatus(inv: { status: InvoiceStatus; dueDate: Date; total: number; amountPaid: number }): DisplayStatus {
  if ((inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID") && balanceOf(inv) > 0 && dbDateKey(inv.dueDate) < dateKey(new Date())) return "OVERDUE";
  return inv.status;
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Unpaid",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  VOID: "Void",
  OVERDUE: "Overdue",
};

export const STATUS_TONE: Record<DisplayStatus, "slate" | "amber" | "gold" | "green" | "rose" | "navy"> = {
  DRAFT: "slate",
  ISSUED: "amber",
  PARTIALLY_PAID: "gold",
  PAID: "green",
  VOID: "slate",
  OVERDUE: "rose",
};

export const PAYMENT_PROVIDERS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CASH", label: "Cash" },
  { value: "FLUTTERWAVE", label: "Card (Flutterwave)" },
] as const;
export const providerLabel = (p: string) => PAYMENT_PROVIDERS.find((x) => x.value === p)?.label ?? p;

/** CRL-2026-0001, counting per year. */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, year = new Date().getFullYear()): Promise<string> {
  const prefix = `CRL-${year}-`;
  const last = await tx.invoice.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Recomputes amount paid and status from successful payments. */
export async function recalcInvoice(tx: Prisma.TransactionClient, invoiceId: number) {
  const inv = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { status: true, total: true } });
  const paid = (await tx.payment.aggregate({ where: { invoiceId, status: "SUCCEEDED" }, _sum: { amount: true } }))._sum.amount ?? 0;
  let status: InvoiceStatus = inv.status;
  if (inv.status !== "VOID") {
    if (paid >= inv.total && inv.total > 0) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";
    else status = inv.status === "DRAFT" ? "DRAFT" : "ISSUED";
  }
  await tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid: paid, status, ...(status !== "DRAFT" && inv.status === "DRAFT" ? { issuedAt: new Date() } : {}) } });
}

/* ------------------------------------------------------------------ settings */

export const PAYMENT_INSTRUCTIONS_KEY = "payment_instructions";
export const DEFAULT_PAYMENT_INSTRUCTIONS =
  "Pay by M-Pesa or bank transfer and use the invoice number as the reference. The Crest Learning office will confirm your payment here.";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  return (await prisma.setting.findUnique({ where: { key } }))?.value ?? fallback;
}

/* ------------------------------------------------------------------ queries */

export const invoiceInclude = {
  student: { select: { id: true, user: { select: { firstName: true, lastName: true, avatarUrl: true } }, level: { select: { name: true } }, curriculum: true } },
  billTo: { select: { id: true, address: true, user: { select: { firstName: true, lastName: true, phone: true, email: true } } } },
  lines: { orderBy: { id: "asc" } },
  payments: { orderBy: { paidAt: "asc" }, include: { recordedBy: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceFull = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

/** Office finance figures. */
export async function financeSummary() {
  const today = new Date(dateKey(new Date()));
  const monthStart = new Date(`${dateKey(new Date()).slice(0, 7)}-01T00:00:00+03:00`);
  const open = await prisma.invoice.findMany({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] } }, select: { total: true, amountPaid: true, dueDate: true } });
  const [collected, drafts] = await Promise.all([
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.count({ where: { status: "DRAFT" } }),
  ]);
  return {
    outstanding: open.reduce((a, i) => a + balanceOf(i), 0),
    overdue: open.filter((i) => i.dueDate < today).reduce((a, i) => a + balanceOf(i), 0),
    overdueCount: open.filter((i) => i.dueDate < today && balanceOf(i) > 0).length,
    collectedThisMonth: collected._sum.amount ?? 0,
    drafts,
  };
}
