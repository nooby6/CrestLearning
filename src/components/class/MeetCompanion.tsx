"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClipboardEdit, Clock3, ExternalLink, Video } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { joinState, joinWindow, untilLabel, type Participant } from "@/lib/classroom";
import { LessonRecordForm, type ExistingRecord } from "./LessonRecordForm";

/**
 * Shown in the Crest tab while the lesson runs in Google Meet (opened in a new tab).
 * Teachers keep the lesson record here and complete it when they finish.
 */
export function MeetCompanion(p: {
  sessionId: number;
  who: Participant;
  startsAt: string;
  endsAt: string;
  status: string;
  title: string;
  timeLabel: string;
  provider: string;
  portalHref: string;
  studentName: string;
  studentAttendance: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | null;
  record: ExistingRecord;
}) {
  const s = { startsAt: new Date(p.startsAt), endsAt: new Date(p.endsAt), status: p.status };
  const [now, setNow] = useState(Date.now());
  const [saved, setSaved] = useState(!!p.record);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const state = joinState(s, p.who, now);
  const started = now >= +s.startsAt;
  const go = `/class/${p.sessionId}/go`;

  return (
    <div className="min-h-[100dvh] bg-ivory">
      <header className="flex items-center gap-4 border-b border-white/10 bg-navy-900 px-4 py-2.5 text-white sm:px-6">
        <Link href={p.portalHref} aria-label="Back to portal">
          <Wordmark tone="light" />
        </Link>
        <div className="min-w-0 flex-1 border-l border-white/10 pl-4">
          <p className="truncate font-display text-sm font-semibold">{p.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-navy-300">
            <Clock3 className="h-3.5 w-3.5 text-gold-400" /> {p.timeLabel}
          </p>
        </div>
        {(p.who === "student" || saved || !started) && (
          <Link href={p.portalHref} className="btn border border-white/15 px-3 py-1.5 text-xs text-navy-100 hover:bg-white/5">
            Back to portal
          </Link>
        )}
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <section className="card p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center bg-navy-800 text-gold-400">
            <Video className="h-6 w-6" />
          </span>
          {state === "upcoming" ? (
            <>
              <h1 className="mt-4 font-display text-lg font-semibold text-navy-900">The lesson opens {untilLabel(joinWindow(s, p.who).opensAt, now)}</h1>
              <p className="mt-1 text-sm text-navy-500">Keep this page open; the button becomes available automatically.</p>
              <span className="btn mt-5 cursor-not-allowed bg-navy-50 text-navy-400">Open {p.provider}</span>
            </>
          ) : state === "open" ? (
            <>
              <h1 className="mt-4 font-display text-lg font-semibold text-navy-900">Your lesson is in {p.provider}</h1>
              <p className="mt-1 text-sm text-navy-500">
                It opened in a new tab. If it didn’t, or you closed it, open it again here.
              </p>
              <a href={go} target="_blank" rel="noopener noreferrer" className="btn-gold mt-5">
                <ExternalLink className="h-4 w-4" /> Open {p.provider}
              </a>
              {p.who === "student" && <p className="mt-4 text-xs text-navy-400">Your attendance was recorded when you joined.</p>}
            </>
          ) : (
            <>
              <h1 className="mt-4 font-display text-lg font-semibold text-navy-900">This lesson is closed</h1>
              <p className="mt-1 text-sm text-navy-500">The link is available from shortly before the start until 30 minutes after the end.</p>
            </>
          )}
        </section>

        {p.who === "teacher" && (
          <section className="card p-6">
            <p className="eyebrow flex items-center gap-1.5">
              <ClipboardEdit className="h-3.5 w-3.5" /> Lesson record · required
            </p>
            <h2 className="mt-1 font-display text-base font-semibold text-navy-900">What did you cover?</h2>
            <p className="mt-1 text-xs text-navy-500">
              Fill this in during or straight after the lesson. You can’t sign out until it is done. Parents see it in the weekly report.
            </p>
            <div className="mt-4">
              {started ? (
                <LessonRecordForm
                  sessionId={p.sessionId}
                  existing={p.record}
                  studentName={p.studentName}
                  studentAttendance={p.studentAttendance}
                  compact
                  onSaved={() => setSaved(true)}
                />
              ) : (
                <p className="text-sm text-navy-400">Available once the lesson starts.</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
