import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { DEFAULT_PAYMENT_INSTRUCTIONS, PAYMENT_INSTRUCTIONS_KEY, balanceOf, getSetting, invoiceInclude, providerLabel } from "@/lib/finance";
import { Card, PageHeader } from "@/components/ui/primitives";
import { PrintButton } from "@/components/reports/PrintButton";
import { InvoiceDocument } from "@/components/finance/InvoiceDocument";
import { InvoiceStatusActions, RecordPayment, RemovePayment } from "@/components/finance/FinanceControls";

export const metadata = { title: "Invoice" };

export default async function AdminInvoicePage({ params }: { params: { id: string } }) {
  await requireRole("admin");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [inv, instructions] = await Promise.all([prisma.invoice.findUnique({ where: { id }, include: invoiceInclude }), getSetting(PAYMENT_INSTRUCTIONS_KEY, DEFAULT_PAYMENT_INSTRUCTIONS)]);
  if (!inv) notFound();
  const balance = balanceOf(inv);
  const payments = inv.payments.filter((p) => p.status === "SUCCEEDED");

  return (
    <>
      <Link href="/admin/finance" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700 print:hidden">
        <ChevronLeft className="h-4 w-4" /> Fees & invoices
      </Link>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Invoice"
          title={`${inv.number} · ${fullName(inv.student.user)}`}
          actions={
            <>
              <PrintButton />
              <InvoiceStatusActions id={inv.id} status={inv.status} hasPayments={payments.length > 0} />
            </>
          }
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <InvoiceDocument inv={inv} instructions={instructions} staffView />
        <div className="space-y-6 print:hidden">
          {inv.status !== "VOID" && inv.status !== "DRAFT" && balance > 0 && (
            <Card title="Record a payment" description={`${formatMoney(balance, inv.currency)} still to pay.`}>
              <RecordPayment invoiceId={inv.id} balanceKes={balance / 100} />
            </Card>
          )}
          {inv.status === "DRAFT" && (
            <Card title="Draft">
              <p className="text-sm text-navy-600">Parents can’t see this invoice until you issue it.</p>
            </Card>
          )}
          <Card title="Payments" bodyClassName="p-0">
            {payments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-navy-500">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold tabular-nums text-navy-900">{formatMoney(p.amount, p.currency)}</span>
                      <RemovePayment id={p.id} label={formatMoney(p.amount, p.currency)} />
                    </div>
                    <p className="text-xs text-navy-500">
                      {p.paidAt ? formatDate(p.paidAt, { day: "numeric", month: "short", year: "numeric" }) : ""} · {providerLabel(p.provider)}
                      {p.receipt && <span className="font-mono"> · {p.receipt}</span>}
                    </p>
                    {p.payerPhone && <p className="text-xs text-navy-400">From {p.payerPhone}</p>}
                    {p.note && <p className="mt-1 text-xs text-navy-600">{p.note}</p>}
                    {p.recordedBy && <p className="mt-1 text-[11px] text-navy-400">Recorded by {fullName(p.recordedBy)}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Link href={`/admin/enrollments/${inv.studentId}`} className="btn-ghost w-full">
            Student’s enrollment & fee plan
          </Link>
        </div>
      </div>
    </>
  );
}
