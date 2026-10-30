import clsx from "clsx";
import Link from "next/link";
import { Megaphone, Pin } from "lucide-react";
import { formatDate, fullName } from "@/lib/format";
import { EmptyState } from "@/components/ui/primitives";

type Item = {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  publishedAt: Date;
  readAt: Date | null;
  author: { firstName: string; lastName: string; avatarUrl: string | null };
};

/** Announcements as people receive them: pinned first, unread marked with a gold edge. */
export function AnnouncementList({ items }: { items: Item[] }) {
  if (!items.length)
    return (
      <EmptyState icon={Megaphone} title="No announcements">
        Notices from the Crest Learning office appear here.
      </EmptyState>
    );
  return (
    <div className="space-y-4">
      {items.map((a) => (
        <article key={a.id} className={clsx("card border-l-4", a.readAt ? "border-l-line" : "border-l-gold-500")}>
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold text-navy-900">{a.title}</h2>
              <p className="mt-0.5 text-xs text-navy-500">
                {fullName(a.author)} · {formatDate(a.publishedAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {a.pinned && (
                <span className="inline-flex items-center gap-1 bg-navy-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
              {!a.readAt && <span className="bg-gold-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy-950">New</span>}
            </div>
          </header>
          <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-navy-800">{a.body}</p>
        </article>
      ))}
    </div>
  );
}

/** A compact strip on dashboards when something new is waiting. */
export function AnnouncementStrip({ href, latest, unread }: { href: string; latest: { title: string } | undefined; unread: number }) {
  if (!unread || !latest) return null;
  return (
    <Link href={href} className="mb-6 flex items-center gap-3 border border-gold-500 border-l-4 bg-gold-50 px-4 py-3 text-sm transition-colors hover:bg-gold-100">
      <Megaphone className="h-4 w-4 shrink-0 text-gold-700" />
      <span className="min-w-0 flex-1 truncate">
        <b className="font-semibold text-navy-900">{unread === 1 ? "New announcement:" : `${unread} new announcements:`}</b> <span className="text-navy-700">{latest.title}</span>
      </span>
      <span className="shrink-0 font-medium text-navy-800">Read →</span>
    </Link>
  );
}
