"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Clock, Loader2 } from "lucide-react";
import { endTimedOutSession, signOut } from "@/lib/actions/auth";

const WARN_MS = 5 * 60_000;

/**
 * Every sign-in lasts 3 hours. Five minutes before the end a bar warns the person;
 * at the end they're signed out and sent to the sign-in page. Timing uses the server's clock.
 */
export function SessionTimeout({ endsAt, serverNow }: { endsAt: string; serverNow: number }) {
  const skew = useRef(serverNow - Date.now()); // server minus browser
  const [end, setEnd] = useState(() => new Date(endsAt).getTime());
  const [left, setLeft] = useState(() => end - (Date.now() + skew.current));
  const [pending, start] = useTransition();
  const firing = useRef(false);

  const expire = useCallback(() => {
    if (firing.current) return;
    firing.current = true;
    start(async () => {
      const r = await endTimedOutSession(); // redirects when the session is over
      if (r?.endsAt) {
        firing.current = false;
        setEnd(new Date(r.endsAt).getTime());
      }
    });
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    // Sleep until the warning window, then count down each second.
    const tick = () => {
      window.clearTimeout(timer);
      const ms = end - (Date.now() + skew.current);
      setLeft(ms);
      if (ms <= 0) return expire();
      timer = window.setTimeout(tick, ms > WARN_MS ? Math.min(ms - WARN_MS, 2_000_000_000) : 1000);
    };
    tick();
    // Background tabs throttle timers; re-check as soon as the tab is looked at again.
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [end, expire]);

  if (left > WARN_MS) return null;
  const secs = Math.max(0, Math.ceil(left / 1000));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-gold-500 bg-navy-800 text-white print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Clock className="h-5 w-5 shrink-0 text-gold-400" />
        <p className="min-w-[12rem] flex-1 text-sm">
          <b className="font-semibold">
            Signing out in <span className="tabular-nums">{mm}:{ss}</span>
          </b>
          <span className="text-navy-100"> — for security, every sign-in lasts 3 hours. Save anything you’re writing.</span>
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { const r = await signOut(); if (r && !r.ok) window.location.href = "/teacher/records"; })}
          className="btn border-gold-500 bg-gold-500 text-navy-950 hover:border-gold-400 hover:bg-gold-400"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Sign in again now
        </button>
      </div>
    </div>
  );
}
