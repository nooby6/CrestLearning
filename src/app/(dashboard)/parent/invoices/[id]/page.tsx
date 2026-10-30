import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { DEFAULT_PAYMENT_INSTRUCTIONS, PAYMENT_INSTRUCTIONS_KEY, getSetting, invoiceInclude } from "@/lib/finance";
import { PrintButton } from "@/components/reports/PrintButton";
import { InvoiceDocument } from "@/components/finance/InvoiceDocument";

export const metadata = { title: "Invoice" };

export default async function ParentInvoicePage({ params }: { params: { id: string } }) {
  const me = await requireRole("parent");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [inv, instructions] = await Promise.all([
    prisma.invoice.findFirst({ where: { id, status: { not: "DRAFT" }, student: { guardians: { some: { parentId: me.id } } } }, include: invoiceInclude }),
    getSetting(PAYMENT_INSTRUCTIONS_KEY, DEFAULT_PAYMENT_INSTRUCTIONS),
  ]);
  if (!inv) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/parent/invoices" className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
          <ChevronLeft className="h-4 w-4" /> Fees & invoices
        </Link>
        <PrintButton />
      </div>
      <InvoiceDocument inv={inv} instructions={instructions} />
    </div>
  );
}
