import Link from "next/link";
import { BookOpenCheck, CalendarCheck2, HeartHandshake, MessageSquareText, Receipt } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName, greeting } from "@/lib/format";
import { formatTime } from "@/lib/schedule";
import { curriculumLabel } from "@/lib/roles";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata = { title: "My children" };

export default async function ParentHome() {
  const me = await requireRole("parent");

  // Scope strictly through the link table — a parent only ever sees their own children.
  const links = await prisma.parentStudent.findMany({
    where: { parentId: me.id, student: { user: { active: true } } },
    include: {
      student: {
        include: {
          user: true,
          level: true,
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              subject: true,
              teacher: { include: { user: true } },
              sessions: {
                where: { status: "SCHEDULED", endsAt: { gt: new Date() } },
                orderBy: { startsAt: "asc" },
                take: 1,
              },
            },
            orderBy: { subject: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <PageHeader
        eyebrow="Parent portal"
        title={`${greeting()}, ${me.firstName}`}
        description={
          links.length > 1
            ? `You're following ${links.length} children at Crest.`
            : links.length === 1
              ? `Here's how ${links[0].student.user.firstName} is doing at Crest.`
              : undefined
        }
      />

      {links.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="No children linked yet">
          The Crest office links your account to your children. Once they do, attendance, lesson notes and invoices
          will appear here.
        </EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {links.map(({ student: s, isPrimary }) => (
            <article key={s.id} className="card flex flex-col overflow-hidden">
              <header className="flex items-center gap-4 border-b border-line bg-gradient-to-r from-navy-50/70 to-white px-5 py-4">
                <Avatar person={s.user} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-navy-900">{fullName(s.user)}</h2>
                  <p className="text-sm text-navy-500">
                    {[curriculumLabel(s.curriculum), s.level?.name].filter((x) => x && x !== "—").join(" · ") ||
                      "Level to be confirmed"}
                  </p>
                  {isPrimary && (
                    <Badge tone="gold" className="mt-1.5 sm:hidden">
                      Primary contact
                    </Badge>
                  )}
                </div>
                {isPrimary && (
                  <Badge tone="gold" className="hidden self-start sm:inline-flex">
                    Primary contact
                  </Badge>
                )}
              </header>

              <div className="flex-1 px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="eyebrow">Subjects</p>
                  <Link href="/parent/timetable" className="text-xs font-medium text-navy-500 hover:text-navy-800">
                    Timetable →
                  </Link>
                </div>
                {s.enrollments.length === 0 ? (
                  <p className="text-sm text-navy-400">Subjects and teachers will appear once lessons are scheduled.</p>
                ) : (
                  <ul className="space-y-3">
                    {s.enrollments.map((e) => (
                      <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                        <span>
                          <span className="block font-medium text-navy-900">{e.subject.name}</span>
                          <span className="block text-xs text-navy-400">with {fullName(e.teacher.user)}</span>
                        </span>
                        <span className="text-right text-xs tabular-nums text-navy-500">
                          {e.sessions[0] ? (
                            <>
                              <span className="block text-[10px] uppercase tracking-wider text-navy-300">Next</span>
                              {formatDate(e.sessions[0].startsAt, { weekday: "short", year: undefined })} · {formatTime(e.sessions[0].startsAt)}
                            </>
                          ) : (
                            "Not scheduled"
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Placeholders that fill in as later modules ship — same positions, so the page won't jump. */}
              <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
                <Tile icon={CalendarCheck2} label="Attendance" note="Module 3" />
                <Tile icon={BookOpenCheck} label="Homework" note="Module 4" />
                <Tile icon={MessageSquareText} label="Teacher notes" note="Module 4" />
                <Tile icon={Receipt} label="Invoices" note="Module 5" />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Tile({ icon: Icon, label, note }: { icon: typeof Receipt; label: string; note: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <Icon className="h-4 w-4 text-gold-500" strokeWidth={1.75} />
      <p className="mt-2 text-xs font-medium text-navy-800">{label}</p>
      <p className="text-[11px] text-navy-300">Arrives in {note}</p>
    </div>
  );
}
