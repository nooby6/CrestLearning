"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ClipboardList, FileText, Users, Video } from "lucide-react";

/**
 * Crest feature bento grid — adapted from a bento-grid features section (framer-motion), reworked for
 * Crest: square tiles with hairline borders on the navy brand panel, gold accents, and each tile
 * showing a real part of the platform. Animations are small and stop when the viewer prefers reduced motion.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Cycles through the curricula Crest teaches (was "TypeTester"). */
function Curricula() {
  const items = ["Cambridge", "Edexcel", "CBE", "IB"];
  const [i, setI] = useState(0);
  const still = useReducedMotion();
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 2200);
    return () => clearInterval(t);
  }, [still, items.length]);
  return (
    <div className="flex h-full items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={items[i]}
          className="font-display text-4xl font-semibold tracking-tight text-white xl:text-5xl"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -18, opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Square "join" rings radiating from the class link (was "GlobalNetwork"). */
function LiveLesson() {
  const still = useReducedMotion();
  return (
    <div className="relative flex h-full items-center justify-center">
      <span className="relative z-10 flex h-14 w-14 items-center justify-center border border-gold-400 bg-navy-800 text-gold-300">
        <Video className="h-6 w-6" strokeWidth={1.75} />
      </span>
      {!still &&
        [0, 1, 2].map((n) => (
          <motion.span
            key={n}
            className="absolute h-14 w-14 border border-gold-400/50"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 2.6, opacity: 0 }}
            transition={{ duration: 2.6, repeat: Infinity, delay: n * 0.85, ease: "easeOut" }}
          />
        ))}
    </div>
  );
}

/** Attendance ticks filling in one by one (was "SecurityBadge"). */
function Attendance() {
  const still = useReducedMotion();
  const [on, setOn] = useState(still ? 3 : 0);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setOn((v) => (v >= 4 ? 0 : v + 1)), 700);
    return () => clearInterval(t);
  }, [still]);
  return (
    <div className="flex h-full items-center gap-2">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className={`flex h-10 w-10 items-center justify-center border ${i < on ? "border-gold-400 bg-gold-500/15" : "border-white/15 bg-white/[0.03]"}`}
          animate={{ scale: i === on - 1 ? 1.08 : 1 }}
          transition={{ duration: 0.25 }}
        >
          <Check className={`h-4 w-4 ${i < on ? "text-gold-300" : "text-white/20"}`} strokeWidth={2.5} />
        </motion.span>
      ))}
    </div>
  );
}

/** Weekly report bars rising (was "LayoutAnimation"). */
function Reports() {
  const still = useReducedMotion();
  const sets = [
    [40, 65, 55, 80, 70],
    [55, 50, 75, 60, 90],
  ];
  const [k, setK] = useState(0);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setK((v) => (v + 1) % sets.length), 2400);
    return () => clearInterval(t);
  }, [still, sets.length]);
  return (
    <div className="flex h-full items-end gap-1.5 pb-1">
      {sets[k].map((h, i) => (
        <motion.span key={i} className={`w-5 ${i === 4 ? "bg-gold-400" : "bg-white/25"}`} animate={{ height: `${h}%` }} transition={{ duration: 0.6, ease: EASE }} />
      ))}
    </div>
  );
}

/** A worksheet being turned in (was "SpeedIndicator"). */
function Worksheet() {
  const still = useReducedMotion();
  const [done, setDone] = useState(!!still);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setDone((v) => !v), 2200);
    return () => clearInterval(t);
  }, [still]);
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/80">
          <FileText className="h-4 w-4" />
        </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={done ? "done" : "todo"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`text-sm font-medium ${done ? "text-gold-300" : "text-white/70"}`}
          >
            {done ? "Turned in · marked 8/10" : "Uploading…"}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="h-1 w-full max-w-[220px] bg-white/10">
        <motion.div className="h-full bg-gold-400" animate={{ width: done ? "100%" : "35%" }} transition={{ duration: 0.8, ease: EASE }} />
      </div>
    </div>
  );
}

function Tile({ className, title, text, icon: Icon, children, delay = 0 }: { className?: string; title: string; text: string; icon?: typeof Users; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      className={`flex flex-col border border-white/[0.12] bg-white/[0.03] p-5 transition-colors hover:border-gold-500/60 hover:bg-white/[0.05] ${className ?? ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <div className="min-h-0 flex-1">{children}</div>
      <div className="mt-4">
        <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-white">
          {Icon && <Icon className="h-4 w-4 text-gold-400" />}
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-navy-200">{text}</p>
      </div>
    </motion.div>
  );
}

export function CrestFeatureGrid() {
  return (
    <div className="grid w-full grid-cols-6 gap-3 [grid-auto-rows:150px] xl:[grid-auto-rows:168px]">
      <Tile className="col-span-3 row-span-2" title="Live lessons" text="One click to join — attendance records itself." icon={Video}>
        <LiveLesson />
      </Tile>
      <Tile className="col-span-3" title="Four curricula" text="Cambridge, Edexcel, CBE and IB." delay={0.08}>
        <Curricula />
      </Tile>
      <Tile className="col-span-3" title="Attendance" text="Captured when students and teachers join." delay={0.16}>
        <Attendance />
      </Tile>
      <Tile className="col-span-2" title="Weekly reports" text="Written by teachers for parents." delay={0.24}>
        <Reports />
      </Tile>
      <Tile className="col-span-4" title="Worksheets" text="Shared, turned in and marked online." icon={ClipboardList} delay={0.32}>
        <Worksheet />
      </Tile>
    </div>
  );
}

export default CrestFeatureGrid;
