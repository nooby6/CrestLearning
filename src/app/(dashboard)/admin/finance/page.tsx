import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Banknote, FilePlus2, FileText, Receipt, Wallet } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import { DEFAULT_PAYMENT_INSTRUCTIONS, PAYMENT_INSTRUCTIONS_KEY, STATUS_LABEL, STATUS_TONE, balanceOf, displayStatus, financeSummary, getSetting } from "@/lib/finance";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui/primitives";
import { SearchInput } from "@/components/ui/SearchInput";
import { GenerateInvoices, PaymentInstructionsEditor } from "@/components/finance/FinanceControls";

export const metadata = { title: "Fees & invoices" };

const TABS = [
  { key: "open", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "draft", label: "Drafts" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function FinancePage({ searchParams }: { searchParams: { tab?: string; q?: string } }) {
  await requireRole("admin");
  const tab: Tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "open";
  const q = searchParams.q?.trim().toLowerCase() ?? "";

  const [summary, instructions, invoices] = await Promise.all([
    financeSummary(),
    getSetting(PAYMENT_INSTRUCTIONS_KEY, DEFAULT_PAYMENT_INSTRUCTIONS),
    prisma.invoice.findMany({
      include: { student: { include: { user: true } }, billTo: { include: { user: true } } },
      orderBy: [{ dueDate: "desc" }, { id: "desc" }],
      take: 500,
    }),
  ]);

  const rows = invoices.map((i) => ({ ...i, shown: displayStatus(i) }));
  const searched = rows.filter(
    (i) => !q || i.number.toLowerCase().includes(q) || fullName(i.student.user).toLowerCase().includes(q) || (i.billTo && fullName(i.billTo.user).toLowerCase().includes(q)),
  );
  const inTab = (i: (typeof rows)[number], t: Tab) =>
    t === "all"
      ? true
      : t === "open"
        ? ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.shown)
        : t === "overdue"
          ? i.shown === "OVERDUE"
          : t === "draft"
            ? i.shown === "DRAFT"
            : i.shown === "PAID";
  const list = searched.filter((i) => inTab(i, tab));
  const count = (t: Tab) => searched.filter((i) => inTab(i, t)).length;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Fees & invoices"
        description="Bill parents, record what they pay and see what’s still owed. Parents see their invoices and balance in their portal."
        actions={
          <Link href="/admin/finance/new" className="btn-primary">
            <FilePlus2 className="h-4 w-4" /> New invoice
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding" value={formatMoney(summary.outstanding)} hint="Across all unpaid invoices" icon={Wallet} tone="navy" href="/admin/finance" />
        <StatCard
          label="Overdue"
          value={formatMoney(summary.overdue)}
          hint={summary.overdueCount ? `${summary.overdueCount} ${summary.overdueCount === 1 ? "invoice" : "invoices"} past due` : "Nothing past due"}
          icon={AlertTriangle}
          tone="rose"
          href="/admin/finance?tab=overdue"
        />
        <StatCard label="Collected this month" value={formatMoney(summary.collectedThisMonth)} hint="Payments recorded" icon={Banknote} tone="teal" />
        <StatCard label="Drafts" value={summary.drafts} hint={summary.drafts ? "Not yet sent to parents" : "All invoices issued"} icon={FileText} tone="gold" href="/admin/finance?tab=draft" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card">
          <div className="flex flex-col border-b border-line px-4 pt-3 sm:px-5 xl:flex-row xl:items-end xl:justify-between xl:gap-3">
            <nav className="-mb-px flex gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const active = t.key === tab;
                const qs = new URLSearchParams({ ...(t.key !== "open" && { tab: t.key }), ...(q && { q }) }).toString();
                return (
                  <Link
                    key={t.key}
                    href={`/admin/finance${qs ? `?${qs}` : ""}`}
                    className={clsx(
                      "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors",
                      active ? "border-navy-800 font-medium text-navy-900" : "border-transparent text-navy-400 hover:text-navy-700",
                    )}
                  >
                    {t.label}
                    <span className={clsx("px-1.5 text-[11px] tabular-nums", active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-500")}>{count(t.key)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="order-first pb-3 xl:order-none">
              <SearchInput placeholder="Student, parent or number" />
            </div>
          </div>

          {list.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Receipt} title={q ? `Nothing matches “${q}”` : tab === "open" ? "No unpaid invoices" : "No invoices here"}>
                {!q && invoices.length === 0 ? "Create an invoice, or set fee plans on students’ enrollments and draft a month’s invoices in one go." : undefined}
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-head">
                    <th className="px-5 py-2.5">Invoice</th>
                    <th className="px-3 py-2.5">Student · billed to</th>
                    <th className="px-3 py-2.5">Due</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Balance</th>
                    <th className="px-5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.map((i) => (
                    <tr key={i.id} className="group hover:bg-ivory/70">
                      <td className="px-5 py-3">
                        <Link href={`/admin/finance/${i.id}`} className="font-mono text-[13px] font-medium text-navy-900 group-hover:underline group-hover:underline-offset-4">
                          {i.number}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/finance/${i.id}`} className="block">
                          <span className="block font-medium text-navy-900">{fullName(i.student.user)}</span>
                          <span className="block text-xs text-navy-400">{i.billTo ? fullName(i.billTo.user) : "No parent"}</span>
                        </Link>
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
        </div>

        <div className="space-y-6">
          <Card title="Monthly billing" description="Draft invoices for every enrolled student on a monthly fee plan.">
            <GenerateInvoices drafts={summary.drafts} />
          </Card>
          <Card title="How parents pay" description="Shown on every unpaid invoice.">
            <PaymentInstructionsEditor value={instructions} />
          </Card>
        </div>
      </div>
    </>
  );
}
