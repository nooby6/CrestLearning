"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { markAnnouncementRead } from "@/lib/actions/announcements";

type Item = { id: number; title: string; body: string; pinned: boolean; publishedAt: string; author: string };

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );

/** A blinking red light. It keeps blinking until every announcement has been opened. */
function RedLight() {
  return (
    <span className="relative flex h-4 w-4 shrink-0" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-70" />
      <span className="crest-blink relative inline-flex h-4 w-4 rounded-full bg-rose-600 shadow-[0_0_10px_2px_rgba(225,29,72,0.7)]" />
    </span>
  );
}

/**
 * Shown at the top of every portal page while someone has unread announcements.
 * Opening an announcement marks it read; once all are read, the alert disappears.
 */
export function AnnouncementAlert({ items }: { items: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const seen = useRef(new Set<number>());
  const dialog = useRef<HTMLDivElement>(null);
  const first = items[0];
  const current = items[index];

  // Mark each announcement read the moment it's on screen.
  useEffect(() => {
    if (!open || !current || seen.current.has(current.id)) return;
    seen.current.add(current.id);
    void markAnnouncementRead(current.id);
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    setIndex(0);
    router.refresh();
  }

  if (!first) return null;
  const more = items.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group mb-6 flex w-full items-center gap-4 border border-rose-300 border-l-[6px] border-l-rose-600 bg-white px-4 py-4 text-left shadow-[0_10px_30px_-18px_rgba(190,18,60,0.6)] transition-colors hover:bg-rose-50 sm:px-5"
        aria-haspopup="dialog"
      >
        <RedLight />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-rose-700">
            {items.length === 1 ? "New announcement from the Crest office" : `${items.length} new announcements from the Crest office`}
          </span>
          <span className="mt-0.5 line-clamp-2 block font-display text-base font-bold leading-snug text-navy-900 sm:truncate sm:text-lg">{first.title}</span>
          {more > 0 && <span className="mt-0.5 block text-[13px] text-navy-600">and {more} more waiting for you</span>}
          <span className="mt-1.5 block text-[13px] font-semibold text-rose-700 underline underline-offset-2 sm:hidden">Tap to read</span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition-colors group-hover:bg-rose-700 sm:inline-flex">
          <Megaphone className="h-4 w-4" /> Read now
        </span>
      </button>

      {open && current && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            tabIndex={-1}
            className="crest-pop flex max-h-[90vh] w-full max-w-xl flex-col border-t-[6px] border-rose-600 bg-white shadow-2xl outline-none"
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-rose-600 text-white">
                <Megaphone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-rose-700">
                  Announcement{items.length > 1 ? ` ${index + 1} of ${items.length}` : ""}
                </p>
                <h2 id="announcement-title" className="mt-0.5 font-display text-lg font-bold leading-snug text-navy-900">
                  {current.title}
                </h2>
                <p className="mt-1 text-xs text-navy-500">
                  {current.author} · {when(current.publishedAt)}
                </p>
              </div>
              <button type="button" onClick={close} className="p-1.5 text-navy-400 hover:text-navy-900" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="overflow-y-auto px-5 py-5">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-navy-800">{current.body}</p>
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-line bg-ivory px-5 py-3.5">
              <p className="text-xs text-navy-500">Marked as read.</p>
              {index < items.length - 1 ? (
                <button type="button" className="btn-primary" onClick={() => setIndex((i) => i + 1)}>
                  Next announcement
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={close}>
                  Done
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
