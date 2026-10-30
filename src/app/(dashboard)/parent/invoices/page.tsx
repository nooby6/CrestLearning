import Link from "next/link";
import clsx from "clsx";
import { Receipt } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { DEFAULT_PAYMENT_INSTRUCTIONS, PAYMENT_INSTRUCTIONS_KEY, STATUS_LABEL, STATUS_TONE, balanceOf, displayStatus, getSetting } from "@/lib/finance";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "Fees & invoices" };

/** Invoices for the parent's children (drafts stay with the office). */
export default async function ParentInvoicesPage() {
  const me = await requireRole("parent");
  const [invoices, instructions] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { notIn: ["DRAFT", "VOID"] }, student: { guardians: { some: { parentId: me.id } } } },
      include: { student: { include: { user: true } } },
      orderBy: [{ dueDate: "desc" }, { id: "desc" }],
    }),
    getSetting(PAYMENT_INSTRUCTIONS_KEY, DEFAULT_PAYMENT_INSTRUCTIONS),
  ]);
  const rows = invoices.map((i) => ({ ...i, shown: displayStatus(i) }));
  const open = rows.filter((i) => i.shown !== "VOID" && balanceOf(i) > 0);
  const owing = open.reduce((a, i) => a + balanceOf(i), 0);
  const overdue = open.filter((i) => i.shown === "OVERDUE");
  const nextDue = [...open].sort((a, b) => +a.dueDate - +b.dueDate)[0];

  return (
    <>
      <PageHeader eyebrow="Parent portal" title="Fees & invoices" description="Your children’s invoices, what’s been paid and what’s still due." />

      <div className="card mb-6 grid sm:grid-cols-[1fr_1.4fr]">
        <div className={clsx("border-l-4 px-5 py-4", overdue.length ? "border-l-rose-600" : owing ? "border-l-amber-500" : "border-l-emerald-600")}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">Balance due</p>
          <p className="mt-1.5 font-display text-[30px] font-semibold leading-none tabular-nums text-navy-900">{formatMoney(owing)}</p>
          <p className={clsx("mt-2 text-xs", overdue.length ? "font-medium text-rose-700" : "text-navy-500")}>
            {overdue.length
              ? `${overdue.length} ${overdue.length === 1 ? "invoice is" : "invoices are"} overdue`
              : nextDue
                ? `Next due ${formatDate(nextDue.dueDate, { weekday: "short", day: "numeric", month: "short", year: undefined })}`
                : "You’re fully paid up. Thank you."}
          </p>
        </div>
        <div className="border-t border-line bg-ivory px-5 py-4 sm:border-l sm:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-500">How to pay</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-navy-700">{instructions}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet">
          When the office sends an invoice, it appears here.
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-2.5">Invoice</th>
                <th className="px-3 py-2.5">For</th>
                <th className="px-3 py-2.5">Due</th>
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Balance</th>
                <th className="px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => (
                <tr key={i.id} className="group hover:bg-ivory/70">
                  <td className="px-5 py-3">
                    <Link href={`/parent/invoices/${i.id}`} className="font-mono text-[13px] font-medium text-navy-900 group-hover:underline group-hover:underline-offset-4">
                      {i.number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <span className="block font-medium text-navy-900">{fullName(i.student.user)}</span>
                    <span className="block text-xs text-navy-400">
                      {formatDate(i.periodStart, { day: "numeric", month: "short", year: undefined })} – {formatDate(i.periodEnd, { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                  <td className={clsx("px-3 py-3 tabular-nums", i.shown === "OVERDUE" ? "font-medium text-rose-700" : "text-navy-600")}>
                    {formatDate(i.dueDate, { day: "numeric", month: "short", year: undefined })}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatMoney(i.total, i.currency)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">{i.shown === "VOID" ? "—" : formatMoney(balanceOf(i), i.currency)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[i.shown]}>{STATUS_LABEL[i.shown]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
