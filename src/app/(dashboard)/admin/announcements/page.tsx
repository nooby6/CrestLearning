import { Megaphone } from "lucide-react";
import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDate, fullName } from "@/lib/format";
import { AUDIENCE_LABEL } from "@/lib/announcements";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { AnnouncementComposer, AnnouncementRowActions } from "@/components/announcements/Announcements";

export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireRole("admin");
  const [parents, items] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PARENT", active: true },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, parent: { select: { children: { select: { student: { select: { user: { select: { firstName: true } } } } } } } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.announcement.findMany({
      include: { author: { select: { firstName: true, lastName: true } }, recipients: { select: { readAt: true, userId: true } } },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 100,
    }),
  ]);
  const options = parents.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    avatarUrl: p.avatarUrl,
    meta: p.parent?.children.length ? `Parent of ${p.parent.children.map((c) => c.student.user.firstName).join(", ")}` : "No children linked",
  }));
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Administration" title="Announcements" description="Send notices to everyone, to teachers, to all parents or to chosen parents. They appear in each person’s portal." />
      <Card title="New announcement" className="mb-6">
        <AnnouncementComposer parents={options} />
      </Card>

      <Card title="Sent" bodyClassName="p-0">
        {items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Megaphone} title="Nothing sent yet">
              Your announcements and who has read them appear here.
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((a) => {
              const others = a.recipients.filter((r) => r.userId !== a.authorId);
              const total = others.length;
              const read = others.filter((r) => r.readAt).length;
              const expired = a.expiresAt && a.expiresAt < now;
              return (
                <li key={a.id} className="flex gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy-900">{a.title}</h3>
                      <Badge tone="navy">{AUDIENCE_LABEL[a.audience]}</Badge>
                      {a.pinned && <Badge tone="gold">Pinned</Badge>}
                      {expired && <Badge tone="slate">Expired</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-navy-600">{a.body}</p>
                    <p className="mt-1.5 text-xs text-navy-400">
                      {fullName(a.author)} · {formatDate(a.publishedAt, { day: "numeric", month: "short", year: "numeric" })}
                      {a.expiresAt && ` · shown until ${formatDate(a.expiresAt, { day: "numeric", month: "short", year: undefined })}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <AnnouncementRowActions id={a.id} pinned={a.pinned} />
                    <div className="w-28 text-right">
                      <p className="text-xs tabular-nums text-navy-600">
                        <b className="font-semibold text-navy-900">{read}</b> of {total} read
                      </p>
                      <div className="mt-1 h-1.5 bg-navy-50">
                        <div className="h-full bg-navy-800" style={{ width: `${total ? (read / total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
