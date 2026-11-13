import Link from "next/link";
import clsx from "clsx";
import { Inbox, Mail, Phone } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { formatTime } from "@/lib/schedule";
import { DELIVERY, ENQUIRY_STATUS, interestLabels, telLink, whatsappLink, type EnquiryStatus } from "@/lib/site";
import { Badge, EmptyState, PageHeader } from "@/components/ui/primitives";
import { EnquiryControls } from "./EnquiryControls";

export const metadata = { title: "Enquiries" };

const TABS: { key: EnquiryStatus | "ALL"; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "ENROLLED", label: "Enrolled" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
];

export default async function EnquiriesPage({ searchParams }: { searchParams: { tab?: string } }) {
  await requireRole("admin");
  const tab = TABS.find((t) => t.key === searchParams.tab)?.key ?? "NEW";
  const [rows, counts] = await Promise.all([
    prisma.enquiry.findMany({
      where: tab === "ALL" ? {} : { status: tab },
      include: { handledBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.enquiry.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (k: string) => (k === "ALL" ? counts.reduce((a, c) => a + c._count, 0) : counts.find((c) => c.status === k)?._count ?? 0);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Enquiries"
        description="Messages sent from the enquiry form on the website. Move each one along as you follow it up."
        actions={
          <Link href="/admissions" target="_blank" className="btn-ghost">
            View the form
          </Link>
        }
      />
      <div className="card @container">
        <nav className="-mb-px flex gap-1 overflow-x-auto border-b border-line px-4 pt-3 sm:px-5">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={t.key === "NEW" ? "/admin/enquiries" : `/admin/enquiries?tab=${t.key}`}
                className={clsx(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                  active ? "border-navy-800 font-medium text-navy-900" : "border-transparent text-navy-400 hover:text-navy-700",
                )}
              >
                {t.label}
                <span className={clsx("px-1.5 text-[11px] tabular-nums", active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-500")}>{count(t.key)}</span>
              </Link>
            );
          })}
        </nav>
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Inbox} title={tab === "NEW" ? "No new enquiries" : "Nothing here"}>
              {tab === "NEW" ? "When a family sends the enquiry form on the website, it appears here." : undefined}
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((e) => {
              const st = ENQUIRY_STATUS[e.status as EnquiryStatus] ?? ENQUIRY_STATUS.NEW;
              const facts = [
                e.studentName && `Student: ${e.studentName}`,
                e.level,
                e.curriculum,
                DELIVERY.find((d) => d.value === e.delivery)?.label,
              ].filter(Boolean) as string[];
              return (
                <li key={e.id} className="grid gap-4 px-5 py-5 @3xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-display text-base font-semibold text-navy-900">{e.parentName}</h2>
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-xs text-navy-400">
                        {formatDate(e.createdAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, {formatTime(e.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {e.email && (
                        <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1.5 text-navy-700 hover:text-navy-900 hover:underline">
                          <Mail className="h-3.5 w-3.5 text-navy-400" /> {e.email}
                        </a>
                      )}
                      {e.phone && (
                        <>
                          <a href={telLink(e.phone)} className="inline-flex items-center gap-1.5 text-navy-700 hover:text-navy-900 hover:underline">
                            <Phone className="h-3.5 w-3.5 text-navy-400" /> {e.phone}
                          </a>
                          <a href={whatsappLink(e.phone)} target="_blank" rel="noreferrer" className="text-navy-500 hover:text-navy-900 hover:underline">
                            WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                    {facts.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {facts.map((f) => (
                          <li key={f} className="border border-line bg-ivory px-2 py-0.5 text-xs text-navy-700">
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    {e.subjects && <p className="mt-3 text-sm text-navy-700">Subjects: {e.subjects}</p>}
                    {e.interests && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-navy-700">
                        STEM Centre:
                        {interestLabels(e.interests).map((l) => (
                          <span key={l} className="border border-navy-800 bg-navy-800 px-2 py-0.5 text-xs font-medium text-white">
                            {l}
                          </span>
                        ))}
                      </p>
                    )}
                    {e.message && <p className="mt-2 whitespace-pre-wrap border-l-2 border-gold-500 pl-3 text-sm leading-relaxed text-navy-800">{e.message}</p>}
                    {e.handledBy && <p className="mt-3 text-[11px] text-navy-400">Last updated by {fullName(e.handledBy)}</p>}
                  </div>
                  <EnquiryControls id={e.id} status={e.status as EnquiryStatus} notes={e.notes ?? ""} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
