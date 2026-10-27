"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, ClipboardEdit, Clock3, Loader2, LogOut, Video, X } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { HEARTBEAT_SEC, joinWindow, untilLabel, type Participant } from "@/lib/classroom";
import { LessonRecordForm, type ExistingRecord } from "./LessonRecordForm";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}
type JitsiApi = { addListener: (e: string, fn: (...a: unknown[]) => void) => void; dispose: () => void; executeCommand: (c: string, ...a: unknown[]) => void };

type Props = {
  sessionId: number;
  who: Participant;
  startsAt: string;
  endsAt: string;
  status: string;
  title: string; // "Mathematics with Achieng Otieno"
  timeLabel: string; // "16:30–18:00"
  portalHref: string;
  room: { domain: string; scriptSrc: string; roomName: string; jwt?: string; demoLimited: boolean };
  user: { name: string; email?: string | null };
  record: ExistingRecord;
};

type Phase = "waiting" | "loading" | "live" | "left" | "closed" | "error";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Could not load the video service."));
    document.head.appendChild(el);
  });
}

export function ClassRoom(p: Props) {
  const window_ = joinWindow({ startsAt: new Date(p.startsAt), endsAt: new Date(p.endsAt) }, p.who);
  const initialPhase: Phase =
    p.status !== "SCHEDULED" || Date.now() > +window_.closesAt ? "closed" : Date.now() < +window_.opensAt ? "waiting" : "loading";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordSaved, setRecordSaved] = useState(!!p.record);
  const holder = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const joined = useRef(false);

  const post = useCallback(
    (event: "join" | "heartbeat" | "leave") =>
      fetch(`/api/class/${p.sessionId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
        keepalive: true,
      }).catch(() => undefined),
    [p.sessionId],
  );

  // Clock for countdowns; flips "waiting" → "loading" when the room opens.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (phase === "waiting" && now >= +window_.opensAt) setPhase("loading");
  }, [now, phase, window_.opensAt]);

  // Mount Jitsi once the room is open.
  useEffect(() => {
    if (phase !== "loading" || api.current) return;
    let cancelled = false;
    loadScript(p.room.scriptSrc)
      .then(() => {
        if (cancelled || !holder.current || !window.JitsiMeetExternalAPI) return;
        const a = new window.JitsiMeetExternalAPI(p.room.domain, {
          roomName: p.room.roomName,
          jwt: p.room.jwt,
          parentNode: holder.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: p.user.name, email: p.user.email ?? undefined },
          configOverwrite: {
            subject: p.title,
            prejoinConfig: { enabled: true },
            disableDeepLinking: true,
            startWithAudioMuted: p.who === "student",
            enableWelcomePage: false,
            disableInviteFunctions: true,
          },
          interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, MOBILE_APP_PROMO: false },
        });
        api.current = a;
        setPhase("live");
        a.addListener("videoConferenceJoined", () => {
          joined.current = true;
          post("join");
        });
        const left = () => {
          if (joined.current) post("leave");
          joined.current = false;
          setPhase("left");
          if (p.who === "teacher") setRecordOpen(true);
        };
        a.addListener("videoConferenceLeft", left);
        a.addListener("readyToClose", left);
      })
      .catch((e: Error) => {
        setError(e.message);
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [phase, p.room, p.user, p.title, p.who, post]);

  // Heartbeat while in the call; leave on tab close.
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => joined.current && post("heartbeat"), HEARTBEAT_SEC * 1000);
    const onHide = () => {
      if (!joined.current) return;
      navigator.sendBeacon(`/api/class/${p.sessionId}/presence`, new Blob([JSON.stringify({ event: "leave" })], { type: "application/json" }));
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", onHide);
    };
  }, [phase, post, p.sessionId]);

  useEffect(() => () => api.current?.dispose(), []);

  const leave = () => {
    if (api.current) {
      api.current.executeCommand("hangup");
      // Some providers don't fire videoConferenceLeft on programmatic hangup.
      setTimeout(() => {
        if (joined.current) {
          post("leave");
          joined.current = false;
        }
        api.current?.dispose();
        api.current = null;
        setPhase("left");
        if (p.who === "teacher") setRecordOpen(true);
      }, 600);
    } else setPhase("left");
  };

  const ends = new Date(p.endsAt);
  const mustRecord = p.who === "teacher" && !recordSaved && (phase === "left" || now > +ends);

  return (
    <div className="flex h-[100dvh] flex-col bg-navy-950 text-white">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-white/10 bg-navy-900 px-4 py-2.5 sm:px-6">
        <Link href={p.portalHref} className="hidden sm:block" aria-label="Back to portal">
          <Wordmark tone="light" />
        </Link>
        <div className="min-w-0 flex-1 sm:border-l sm:border-white/10 sm:pl-4">
          <p className="truncate font-display text-sm font-semibold">{p.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-navy-300">
            <Clock3 className="h-3.5 w-3.5 text-gold-400" />
            {p.timeLabel}
            {phase === "live" && <span className="text-navy-400">· ends {untilLabel(ends, now)}</span>}
          </p>
        </div>
        {p.who === "teacher" && (phase === "live" || phase === "left" || phase === "closed") && (
          <button
            type="button"
            onClick={() => setRecordOpen((v) => !v)}
            className={clsx("btn border px-3 py-1.5 text-xs", recordSaved ? "border-white/15 text-navy-100 hover:bg-white/5" : "border-gold-500/60 text-gold-300 hover:bg-gold-500/10")}
          >
            <ClipboardEdit className="h-4 w-4" />
            <span className="hidden sm:inline">{recordSaved ? "Lesson record" : "Record lesson"}</span>
          </button>
        )}
        {phase === "live" ? (
          <button type="button" onClick={leave} className="btn bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-500">
            <LogOut className="h-4 w-4" /> Leave
          </button>
        ) : (
          !mustRecord && (
            <Link href={p.portalHref} className="btn border border-white/15 px-3 py-1.5 text-xs text-navy-100 hover:bg-white/5">
              Back to portal
            </Link>
          )
        )}
      </header>

      {p.room.demoLimited && p.who === "teacher" && phase === "live" && (
        <p className="flex items-center gap-2 bg-amber-500/15 px-4 py-1.5 text-[11px] text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" /> Demo video server — calls end after a few minutes. The office needs to connect a JaaS account for full-length classes.
        </p>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {/* Jitsi mounts here */}
          <div ref={holder} className={clsx("absolute inset-0", phase !== "live" && "hidden")} />

          {phase === "waiting" && (
            <Centered>
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-gold-400">
                <Video className="h-6 w-6" />
              </span>
              <h1 className="font-display text-xl font-semibold">The class opens {untilLabel(window_.opensAt, now)}</h1>
              <p className="mt-2 max-w-sm text-sm text-navy-300">
                You can join from {new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Nairobi" }).format(window_.opensAt)}.
                Keep this page open — it will connect automatically.
              </p>
            </Centered>
          )}
          {phase === "loading" && (
            <Centered>
              <Loader2 className="h-6 w-6 animate-spin text-gold-400" />
              <p className="mt-3 text-sm text-navy-300">Connecting to the classroom…</p>
            </Centered>
          )}
          {phase === "error" && (
            <Centered>
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <h1 className="mt-3 font-display text-lg font-semibold">We couldn’t start the video</h1>
              <p className="mt-2 max-w-sm text-sm text-navy-300">{error} Check your internet connection and try again.</p>
              <button type="button" className="btn-gold mt-5" onClick={() => window.location.reload()}>
                Try again
              </button>
            </Centered>
          )}
          {(phase === "left" || phase === "closed") && (
            <Centered>
              <h1 className="font-display text-xl font-semibold">{phase === "left" ? "You have left the class" : "This class is not open"}</h1>
              <p className="mt-2 max-w-sm text-sm text-navy-300">
                {p.who === "teacher"
                  ? recordSaved
                    ? "Thank you — the lesson record is saved."
                    : "Please complete the lesson record before you go."
                  : "Your attendance has been recorded."}
              </p>
              {!mustRecord && (
                <div className="mt-5 flex gap-3">
                  {phase === "left" && Date.now() < +window_.closesAt && (
                    <button type="button" className="btn border border-white/15 text-navy-100 hover:bg-white/5" onClick={() => window.location.reload()}>
                      Rejoin
                    </button>
                  )}
                  <Link href={p.portalHref} className="btn-gold">
                    Back to portal
                  </Link>
                </div>
              )}
            </Centered>
          )}
        </div>

        {/* Lesson record panel (teacher) */}
        {p.who === "teacher" && (recordOpen || mustRecord) && (
          <aside
            className={clsx(
              "z-20 w-full max-w-md shrink-0 overflow-y-auto border-l border-white/10 bg-white p-5 text-navy-900",
              mustRecord ? "absolute inset-0 m-auto h-fit max-h-[90%] rounded-xl shadow-2xl sm:inset-x-auto sm:right-6 sm:top-6" : "absolute inset-y-0 right-0 sm:relative",
            )}
            role={mustRecord ? "dialog" : undefined}
            aria-modal={mustRecord || undefined}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{mustRecord ? "Required before you leave" : "Lesson record"}</p>
                <h2 className="mt-1 font-display text-base font-semibold">What did you cover today?</h2>
                <p className="mt-1 text-xs text-navy-500">Parents see this in the weekly report. You can fill it in during the lesson.</p>
              </div>
              {!mustRecord && (
                <button type="button" onClick={() => setRecordOpen(false)} className="rounded p-1 text-navy-300 hover:text-navy-700" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <LessonRecordForm
              sessionId={p.sessionId}
              existing={p.record}
              compact
              onSaved={() => {
                setRecordSaved(true);
                if (phase !== "live") setRecordOpen(false);
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">{children}</div>;
}
