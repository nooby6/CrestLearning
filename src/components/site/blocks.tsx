import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { ArrowUpRight, HelpCircle, MessageSquareText } from "lucide-react";
import { PHOTOS, type PhotoKey } from "./photos";

/** A photo that fills its (positioned) parent. */
export function Photo({ k, sizes, priority, className, position }: { k: PhotoKey; sizes: string; priority?: boolean; className?: string; position?: string }) {
  const p = PHOTOS[k];
  return <Image src={p.src} alt={p.alt} fill sizes={sizes} priority={priority} className={clsx("object-cover", className)} style={position ? { objectPosition: position } : undefined} />;
}

/** Inner-page hero: full-width photo under a navy wash, angled bottom edge. */
export function PageHero({ photo, kicker, title, children, position = "center" }: { photo: PhotoKey; kicker?: string; title: string; children?: React.ReactNode; position?: string }) {
  return (
    <section className="angle-bottom relative isolate overflow-hidden bg-navy-900 text-white">
      <Photo k={photo} sizes="100vw" priority position={position} className="-z-20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-900/80 to-navy-900/35" />
      <div className="hero-rise site-wrap pb-[calc(5vw+72px)] pt-20 sm:pt-24">
        {kicker && <p className="site-kicker text-gold-400">{kicker}</p>}
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(34px,7vw,58px)] font-extrabold leading-[1.04] tracking-[-0.025em]">{title}</h1>
        {children && <div className="mt-5 max-w-[56ch] text-lg leading-[1.65] text-navy-100">{children}</div>}
      </div>
    </section>
  );
}

export function SectionHead({ kicker, title, children, center }: { kicker?: string; title: string; children?: React.ReactNode; center?: boolean }) {
  return (
    <div className={clsx("max-w-3xl", center && "mx-auto text-center")}>
      {kicker && <p className={clsx("site-kicker", center && "justify-center")}>{kicker}</p>}
      <h2 className="site-h2 mt-3">{title}</h2>
      {children && <div className={clsx("site-lead mt-4", center && "mx-auto")}>{children}</div>}
    </div>
  );
}

export const PROGRAMMES = [
  {
    id: "primary",
    title: "Primary",
    ages: "Ages 5 to 11",
    photo: "primaryWriting" as PhotoKey,
    body: "Confident reading, writing and number work, and the study habits that make everything after easier.",
    curricula: ["Cambridge Primary", "CBE Grades 1 to 6"],
  },
  {
    id: "lower-secondary",
    title: "Lower Secondary",
    ages: "Ages 11 to 14",
    photo: "boyWriting" as PhotoKey,
    body: "A broader timetable and more independent work, with any gaps closed before the exam years begin.",
    curricula: ["Cambridge Lower Secondary", "CBE Junior School, Grades 7 to 9"],
  },
  {
    id: "igcse",
    title: "IGCSE and GCSE",
    ages: "Ages 14 to 16",
    photo: "examPrep" as PhotoKey,
    body: "Two-year courses taught to the exam board’s syllabus, with past-paper practice built in from the start.",
    curricula: ["Cambridge IGCSE", "Pearson Edexcel International GCSE"],
  },
  {
    id: "a-level",
    title: "A Level and IB Diploma",
    ages: "Ages 16 to 18",
    photo: "graduateWoman" as PhotoKey,
    body: "Specialist teaching in the subjects that matter for university, with the depth and technique top grades need.",
    curricula: ["Cambridge AS and A Level", "Pearson Edexcel International A Level", "IB Diploma"],
  },
];

export function ProgrammeCards() {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {PROGRAMMES.map((p) => (
        <li key={p.id}>
          <Link href={`/programmes#${p.id}`} className="group flex h-full flex-col border border-line bg-white transition-shadow hover:shadow-[0_28px_50px_-30px_rgba(10,29,79,0.55)]">
            <div className="photo-zoom cut-corner relative aspect-[4/3] overflow-hidden bg-navy-100">
              <Photo k={p.photo} sizes="(min-width:1280px) 300px, (min-width:640px) 50vw, 100vw" />
              <span className="absolute left-0 top-5 bg-gold-500 px-3 py-1.5 text-[13px] font-bold text-navy-950">{p.ages}</span>
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-display text-xl font-extrabold text-navy-900">{p.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-navy-700">{p.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-navy-800 group-hover:text-gold-700">
                Learn more <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const AUDIENCES: { title: string; body: string; photo: PhotoKey }[] = [
  { title: "Athletes and performers", body: "A timetable built around training, rehearsals and competitions.", photo: "athletics" },
  { title: "Exam candidates", body: "Focused preparation for IGCSE, A Level and IB exams, subject by subject.", photo: "examPrep" },
  { title: "Relocating and international families", body: "Keep the same curriculum through a move, in Nairobi or online.", photo: "westlands" },
  { title: "Learners who need more support", body: "Patient one-to-one teaching that rebuilds confidence and closes gaps.", photo: "helping" },
  { title: "Curious, able learners", body: "Room to go further and faster than a class can allow.", photo: "reading" },
  { title: "Families who want flexibility", body: "Learning at home, at our centre or online, as your week requires.", photo: "homeStudy" },
];

export function AudienceTiles() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {AUDIENCES.map((a) => (
        <li key={a.title} className="group relative isolate aspect-[4/3] overflow-hidden bg-navy-900 sm:aspect-[5/6] lg:aspect-[4/5]">
          <div className="photo-zoom absolute inset-0 -z-20">
            <Photo k={a.photo} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/55 to-transparent" />
          <div className="flex h-full flex-col justify-end p-6 text-white">
            <span className="mb-3 h-[3px] w-10 bg-gold-500 transition-all duration-300 group-hover:w-16" aria-hidden />
            <h3 className="font-display text-xl font-extrabold leading-tight">{a.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-100">{a.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NextSteps() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="site-wrap">
        <SectionHead kicker="Get started" title="What’s your next step?" center />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            {
              icon: HelpCircle,
              title: "I have a general question about Crest",
              body: "Ask about lessons, timetables, fees or how homeschooling works. We’ll point you in the right direction.",
              cta: "Get in touch",
              href: "/contact",
              dark: false,
            },
            {
              icon: MessageSquareText,
              title: "I’d like advice for my learner",
              body: "Tell us their curriculum, level and goals. Our admissions team will recommend a plan and teachers.",
              cta: "Submit an enquiry",
              href: "/admissions#enquire",
              dark: true,
            },
          ].map((c) => (
            <div key={c.title} className={clsx("cut-corner flex flex-col p-8 sm:p-10", c.dark ? "bg-navy-800 text-white" : "border border-line bg-canvas text-navy-900")}>
              <span className={clsx("grid h-12 w-12 place-items-center", c.dark ? "bg-gold-500 text-navy-950" : "bg-navy-800 text-white")}>
                <c.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-extrabold leading-snug">{c.title}</h3>
              <p className={clsx("mt-3 flex-1 text-[16px] leading-relaxed", c.dark ? "text-navy-100" : "text-navy-700")}>{c.body}</p>
              <Link href={c.href} className={clsx("mt-8 self-start px-6 py-3", c.dark ? "btn-gold font-semibold" : "btn-primary")}>
                {c.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CURRICULA = [
  { name: "Cambridge", levels: "Primary, Lower Secondary, IGCSE, AS and A Level" },
  { name: "Pearson Edexcel", levels: "International GCSE and International A Level" },
  { name: "CBE", levels: "Primary and Junior School, Grades 1 to 9" },
  { name: "International Baccalaureate", levels: "IB Diploma" },
];

export function CurriculaStrip() {
  return (
    <ul className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {CURRICULA.map((c) => (
        <li key={c.name} className="bg-white p-6">
          <p className="font-display text-xl font-extrabold text-navy-900">{c.name}</p>
          <span className="mt-3 block h-[3px] w-8 bg-gold-500" aria-hidden />
          <p className="mt-3 text-[15px] leading-relaxed text-navy-700">{c.levels}</p>
        </li>
      ))}
    </ul>
  );
}
