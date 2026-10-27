import Image from "next/image";
import clsx from "clsx";

/** The logo's "E": three stacked bars, the middle one gold. */
function CrestE({ light }: { light: boolean }) {
  const bar = light ? "#FFFFFF" : "#0A1D4F";
  return (
    <svg viewBox="0 0 10 12" aria-hidden className="mx-[0.06em] inline-block h-[0.72em] w-[0.6em] align-baseline">
      <rect x="0" y="0" width="10" height="2.3" fill={bar} />
      <rect x="0" y="4.85" width="10" height="2.3" fill="#C69A3A" />
      <rect x="0" y="9.7" width="10" height="2.3" fill={bar} />
    </svg>
  );
}

/** Compact lock-up: emblem + "CREST / LEARNING" set like the official logo. */
export function Wordmark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  return (
    <span className={clsx("flex items-center gap-2.5", className)} aria-label="Crest Learning">
      <Image
        src={light ? "/brand/crest-mark-light.png" : "/brand/crest-mark.png"}
        alt=""
        width={44}
        height={32}
        priority
        className="h-8 w-auto"
      />
      <span className="flex flex-col leading-none" aria-hidden>
        <span
          className={clsx(
            "font-display text-[17px] font-bold tracking-[0.08em]",
            light ? "text-white" : "text-navy-800",
          )}
        >
          CR<CrestE light={light} />ST
        </span>
        <span className="mt-1 font-display text-[8.5px] font-semibold tracking-[0.42em] text-gold-500">
          LEARNING
        </span>
      </span>
    </span>
  );
}
