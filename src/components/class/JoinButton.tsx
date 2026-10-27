"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Video } from "lucide-react";
import { joinState, joinWindow, untilLabel, type Participant } from "@/lib/classroom";

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
}: {
  sessionId: number;
  startsAt: string;
  endsAt: string;
  status: string;
  who: Participant;
  size?: "sm" | "md";
  tone?: "gold" | "navy";
  external?: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const s = { startsAt: new Date(startsAt), endsAt: new Date(endsAt), status };
  const state = now === null ? "upcoming" : joinState(s, who, now);
  if (state === "closed") return null;

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
