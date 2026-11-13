import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight, Code2, FlaskConical } from "lucide-react";
import { Photo } from "./blocks";
import type { PhotoKey } from "./photos";

/**
 * Two photos split by an angled gold seam: the laboratory on one side, code on the other.
 * The seam is the STEM Centre's visual signature on the website.
 */
export function SplitPhoto({
  left = "labTeacher",
  right = "codingGirl",
  sizes,
  priority,
  className,
  leftPosition,
  rightPosition,
}: {
  left?: PhotoKey;
  right?: PhotoKey;
  sizes: string;
  priority?: boolean;
  className?: string;
  leftPosition?: string;
  rightPosition?: string;
}) {
  return (
    <div className={clsx("absolute inset-0 overflow-hidden bg-navy-900", className)}>
      <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 58% 0, 46% 100%, 0 100%)" }}>
        <Photo k={left} sizes={sizes} priority={priority} position={leftPosition} />
      </div>
      <div className="absolute inset-0" style={{ clipPath: "polygon(60% 0, 100% 0, 100% 100%, 48% 100%)" }}>
        <Photo k={right} sizes={sizes} priority={priority} position={rightPosition} />
      </div>
      {/* the gold seam */}
      <div className="absolute inset-0 bg-gold-500" style={{ clipPath: "polygon(58% 0, 60% 0, 48% 100%, 46% 100%)" }} aria-hidden />
    </div>
  );
}

export const STEM_STRANDS = [
  {
    id: "lab",
    icon: FlaskConical,
    title: "Science laboratory",
    body: "Real experiments in biology, chemistry and physics, from first investigations at primary to the practical papers at IGCSE and A Level.",
    cta: "Inside the lab",
  },
  {
    id: "coding",
    icon: Code2,
    title: "Coding and programming",
    body: "A clear path from block coding at seven to Python, web development and Computer Science exams, at our centre or live online.",
    cta: "The coding pathway",
  },
] as const;

/** Home-page band introducing the STEM Centre. */
export function StemFeature() {
  return (
    <section className="angle-both relative isolate overflow-hidden bg-navy-950 py-[calc(5vw+64px)] text-white">
      <div className="site-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <p className="site-kicker text-gold-400">Crest STEM Centre</p>
          <h2 className="mt-3 max-w-xl font-display text-[clamp(30px,4.6vw,46px)] font-extrabold leading-[1.06] tracking-[-0.02em]">
            Laboratory experiments and coding classes, alongside your tuition
          </h2>
          <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.7] text-navy-100">
            Science makes sense when students see it happen, and coding is learnt by writing code. Our STEM Centre gives Crest students a working
            laboratory and a coding pathway from age seven, taught by specialists and reported to parents like every other lesson.
          </p>
          <ul className="mt-9 grid gap-4 sm:grid-cols-2">
            {STEM_STRANDS.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stem#${s.id}`}
                  className="group flex h-full flex-col border border-white/15 bg-white/[0.04] p-5 transition-colors hover:border-gold-500 hover:bg-white/[0.08]"
                >
                  <span className="grid h-11 w-11 place-items-center bg-gold-500 text-navy-950">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="mt-4 font-display text-lg font-extrabold">{s.title}</span>
                  <span className="mt-1.5 flex-1 text-[15px] leading-relaxed text-navy-200">{s.body}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-gold-400">
                    {s.cta} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/stem" className="btn-gold mt-9 px-7 py-3.5 font-bold">
            Explore the STEM Centre
          </Link>
        </div>
        <div className="relative aspect-[4/3] lg:aspect-[5/6]">
          <SplitPhoto sizes="(min-width:1024px) 50vw, 100vw" className="cut-corner" leftPosition="35% center" rightPosition="60% center" />
          <span className="absolute bottom-5 left-0 bg-white px-3 py-1.5 text-[13px] font-bold text-navy-950">In the lab</span>
          <span className="absolute right-0 top-5 bg-gold-500 px-3 py-1.5 text-[13px] font-bold text-navy-950">Writing code</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ code card */

type Tok = [string, "k" | "s" | "n" | "c" | "f" | ""];
const K = (t: string): Tok => [t, "k"];
const S = (t: string): Tok => [t, "s"];
const N = (t: string): Tok => [t, "n"];
const C = (t: string): Tok => [t, "c"];
const F = (t: string): Tok => [t, "f"];
const P = (t: string): Tok => [t, ""];

/** A first Python project, the kind students write in their first term. */
const GUESS: Tok[][] = [
  [C("# Guess the number: a first Python project")],
  [K("import"), P(" random")],
  [],
  [P("secret = random."), F("randint"), P("("), N("1"), P(", "), N("100"), P(")")],
  [P("guess = "), N("0")],
  [],
  [K("while"), P(" guess != secret:")],
  [P("    guess = "), F("int"), P("("), F("input"), P("("), S("\"Your guess: \""), P("))")],
  [P("    "), K("if"), P(" guess < secret:")],
  [P("        "), F("print"), P("("), S("\"Higher\""), P(")")],
  [P("    "), K("elif"), P(" guess > secret:")],
  [P("        "), F("print"), P("("), S("\"Lower\""), P(")")],
  [],
  [F("print"), P("("), S("\"You got it!\""), P(")")],
];

const TONE: Record<Tok[1], string> = { k: "text-gold-400", s: "text-emerald-300", n: "text-sky-300", c: "text-navy-400 italic", f: "text-violet-300", "": "text-navy-50" };

export function CodeCard({ className }: { className?: string }) {
  return (
    <figure className={clsx("overflow-hidden border border-white/10 bg-navy-950 shadow-[0_40px_80px_-40px_rgba(3,11,36,0.9)]", className)}>
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 bg-white/25" />
          <span className="h-2.5 w-2.5 bg-white/25" />
          <span className="h-2.5 w-2.5 bg-gold-500" />
        </span>
        <span className="font-mono text-xs text-navy-300">guess_the_number.py</span>
      </div>
      <pre className="overflow-x-auto px-0 py-4 font-mono text-[13px] leading-[1.75] sm:text-sm" aria-label="A short Python program: a number guessing game">
        <code>
          {GUESS.map((line, i) => (
            <span key={i} className="flex">
              <span className="w-10 shrink-0 select-none pr-4 text-right text-navy-500" aria-hidden>
                {i + 1}
              </span>
              <span className="whitespace-pre pr-5">
                {line.length === 0 ? " " : line.map(([t, k], j) => <span key={j} className={TONE[k]}>{t}</span>)}
              </span>
            </span>
          ))}
        </code>
      </pre>
      <figcaption className="border-t border-white/10 px-4 py-3 text-[13px] text-navy-200">
        A typical first Python project: loops, conditions and input, in fourteen lines.
      </figcaption>
    </figure>
  );
}
