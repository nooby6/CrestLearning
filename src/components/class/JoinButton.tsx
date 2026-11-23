"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { CheckCircle2, Loader2, MapPin, Video } from "lucide-react";
import { joinState, joinWindow, untilLabel, type Participant } from "@/lib/classroom";
import { startInPersonLesson } from "@/lib/actions/schedule";

/**
 * Live-updating join control: disabled with a countdown until the lesson opens.
 * With a Meet link (`external`), it opens the meeting in a new tab via /class/[id]/go
 * (which records attendance) and turns this tab into the lesson companion page.
 */
export function JoinButton({
  sessionId,
  startsAt,
  endsAt,
  status,
  who,
  size = "md",
  tone = "gold",
  external = false,
  mode = "ONLINE",
  room,
  checkedIn = false,
}: {
  sessionId: number;
  startsAt: string;
  endsAt: string;
  status: string;
  who: Participant;
  size?: "sm" | "md";
  tone?: "gold" | "navy";
  external?: boolean;
  /** In person: no video call. The student sees where to go; the teacher checks in with "Start lesson". */
  mode?: string;
  room?: string | null;
  /** In person, teacher: already checked in. */
  checkedIn?: boolean;
}) {
  const router = useRouter();
  const [starting, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const s = { startsAt: new Date(startsAt), endsAt: new Date(endsAt), status };
  const state = now === null ? "upcoming" : joinState(s, who, now);
  if (state === "closed") return null;

  if (mode === "IN_PERSON") {
    const pad = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
    if (who === "student")
      return (
        <span className={clsx("inline-flex items-center gap-1.5 bg-gold-100 font-semibold text-gold-800", pad)} title="This lesson is at the centre">
          <MapPin className="h-4 w-4" /> {room ? `In person · ${room}` : "In person"}
        </span>
      );
    if (checkedIn)
      return (
        <span className={clsx("inline-flex items-center gap-1.5 font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200", pad)}>
          <CheckCircle2 className="h-4 w-4" /> Started
        </span>
      );
    if (state === "open")
      return (
        <button
          type="button"
          disabled={starting}
          className={clsx(
            "btn",
            size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2",
            tone === "gold" ? "bg-gold-500 text-navy-950 hover:bg-gold-400" : "bg-navy-800 text-white hover:bg-navy-700",
          )}
          onClick={() =>
            startTransition(async () => {
              const r = await startInPersonLesson(sessionId);
              if (r.ok) {
                toast.success(r.message);
                router.refresh();
              } else toast.error(r.error);
            })
          }
          title={room ? `In person · ${room}` : "In person"}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          Start lesson
        </button>
      );
    return (
      <span className={clsx("btn cursor-not-allowed bg-navy-50 text-navy-400", size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2")} aria-disabled>
        <MapPin className="h-4 w-4" />
        {now === null ? "Start lesson" : `Opens ${untilLabel(joinWindow(s, who).opensAt, now)}`}
      </span>
    );
  }

  const cls = clsx(
    "btn",
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2",
    state === "open"
      ? tone === "gold"
        ? "bg-gold-500 text-navy-950 hover:bg-gold-400"
        : "bg-navy-800 text-white hover:bg-navy-700"
      : "cursor-not-allowed bg-navy-50 text-navy-400",
  );

  if (state === "open") {
    const live = now! >= +s.startsAt;
    const body = (
      <>
        <Video className="h-4 w-4" />
        {live ? "Join lesson" : "Join early"}
        {live && (
          <span className="relative ml-0.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
        )}
      </>
    );
    if (external) {
      return (
        <a
          href={`/class/${sessionId}/go`}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          onClick={() => setTimeout(() => router.push(`/class/${sessionId}`), 50)}
        >
          {body}
        </a>
      );
    }
    return (
      <Link href={`/class/${sessionId}`} className={cls} prefetch={false}>
        {body}
      </Link>
    );
  }
  return (
    <span className={cls} aria-disabled title="The class opens shortly before it starts">
      <Video className="h-4 w-4" />
      {now === null ? "Join lesson" : `Opens ${untilLabel(joinWindow(s, who).opensAt, now)}`}
    </span>
  );
}
