import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { PageHeader } from "@/components/ui/primitives";
import { InvoiceForm, type InvoiceStudent } from "@/components/finance/InvoiceForm";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: { searchParams: { student?: string } }) {
  await requireRole("admin");
  const rows = await prisma.student.findMany({
    where: { user: { active: true } },
    include: {
      user: true,
      level: true,
      guardians: { include: { parent: { include: { user: true } } }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      feePlans: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 1 },
      enrollments: { where: { status: "ACTIVE" }, include: { subject: true }, orderBy: { subject: { name: "asc" } } },
    },
    orderBy: [{ user: { firstName: "asc" } }, { user: { lastName: "asc" } }],
  });
  const students: InvoiceStudent[] = rows.map((s) => ({
    id: s.id,
    firstName: s.user.firstName,
    lastName: s.user.lastName,
    avatarUrl: s.user.avatarUrl,
    meta: s.enrollments.length ? s.enrollments.map((e) => e.subject.name).join(", ") : "Not enrolled",
    guardians: s.guardians.map((g) => ({ id: g.parentId, name: fullName(g.parent.user), primary: g.isPrimary })),
    plan: s.feePlans[0] ? { name: s.feePlans[0].name, amountKes: s.feePlans[0].amount / 100, cycle: s.feePlans[0].cycle } : null,
    subjects: s.enrollments.map((e) => ({ enrollmentId: e.id, label: `${e.subject.name} tuition` })),
  }));

  return (
    <>
      <Link href="/admin/finance" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
        <ChevronLeft className="h-4 w-4" /> Fees & invoices
      </Link>
      <PageHeader eyebrow="Fees & invoices" title="New invoice" description="Lines start from the student’s fee plan or their subjects — adjust anything before you issue it." />
      <InvoiceForm students={students} initialStudentId={searchParams.student} />
    </>
  );
}
