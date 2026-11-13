import Link from "next/link";
import { CheckCircle2, ClipboardList, FlaskConical, Glasses, MonitorPlay, ShieldCheck, Building2, UserRound } from "lucide-react";
import { NextSteps, Photo, SectionHead } from "@/components/site/blocks";
import { CodeCard, SplitPhoto } from "@/components/site/stem";
import type { PhotoKey } from "@/components/site/photos";

export const metadata = {
  title: "STEM Centre: science laboratory and coding",
  description:
    "The Crest STEM Centre in Nairobi: hands-on laboratory experiments in biology, chemistry and physics, IGCSE and A Level practical preparation, and coding classes from Scratch to Python and Computer Science.",
};

const WHY = [
  {
    icon: FlaskConical,
    title: "Science you can see",
    body: "Students carry out the experiments they read about, so ideas like rates of reaction or electrical resistance stop being words on a page.",
  },
  {
    icon: ClipboardList,
    title: "Practical exam preparation",
    body: "IGCSE and A Level sciences include practical skills. Students who homeschool or study privately can be ready for them here.",
  },
  {
    icon: MonitorPlay,
    title: "Coding as a real skill",
    body: "Students write and run their own programs from the first lesson, building towards Computer Science exams and projects of their own.",
  },
];

const EXPERIMENTS: { subject: string; items: string[] }[] = [
  { subject: "Biology", items: ["Looking at plant and animal cells under the microscope", "Food tests for starch, sugar and protein", "How temperature affects enzymes", "Osmosis in potato tissue"] },
  { subject: "Chemistry", items: ["Titration to find a solution’s concentration", "Rates of reaction with temperature and concentration", "Separating inks by chromatography", "Testing for ions and gases"] },
  { subject: "Physics", items: ["Measuring resistance in series and parallel circuits", "The period of a pendulum", "Specific heat capacity", "Refraction through a glass block"] },
];

const LAB_SKILLS = [
  "Planning a fair test and choosing variables",
  "Measuring accurately and recording results in tables",
  "Drawing and reading graphs",
  "Explaining results and evaluating the method",
];

const PATHWAY: { ages: string; title: string; body: string; topics: string[]; photo: PhotoKey }[] = [
  {
    ages: "Ages 7 to 10",
    title: "Block coding",
    body: "Students build animations, stories and simple games by snapping code blocks together in Scratch.",
    topics: ["Sequences and loops", "Events and simple logic", "Planning a project"],
    photo: "codingTablet",
  },
  {
    ages: "Ages 10 to 13",
    title: "First text-based code",
    body: "The move to typed code: short Python programs and first web pages with HTML and CSS.",
    topics: ["Variables, conditions and functions", "Finding and fixing bugs", "Building a web page"],
    photo: "codingGirl",
  },
  {
    ages: "Ages 14 to 16",
    title: "IGCSE Computer Science",
    body: "Taught to the Cambridge IGCSE or Pearson Edexcel International GCSE syllabus, with the programming practice the exams expect.",
    topics: ["Algorithms and pseudocode", "Programming in Python", "Data, networks and past papers"],
    photo: "codeScreen",
  },
  {
    ages: "Ages 16 to 18",
    title: "A Level and independent projects",
    body: "Cambridge AS and A Level Computer Science, and larger projects that show universities what a student can build.",
    topics: ["Data structures and object-oriented programming", "Exam-standard problem solving", "A portfolio project"],
    photo: "codingClass",
  },
];

const HOW = [
  { icon: UserRound, title: "Specialist teachers", body: "Science practicals are run by science teachers, and coding is taught by teachers who write code." },
  { icon: Building2, title: "Lab sessions at the centre", body: "Experiments take place in the Crest laboratory. Coding lessons can be at the centre or live online." },
  { icon: ShieldCheck, title: "Safe, supervised work", body: "A teacher supervises every lab session, with goggles, lab coats and gloves provided." },
  { icon: ClipboardList, title: "Recorded and reported", body: "Each session is logged in the parent portal with what was covered, and appears in the weekly report." },
];

export default function StemPage() {
  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="angle-bottom relative isolate overflow-hidden bg-navy-900 text-white">
        <SplitPhoto left="labTeacher" right="codingGirl" sizes="100vw" priority className="-z-20" leftPosition="30% center" rightPosition="65% center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-950/75 to-navy-950/10 max-lg:via-navy-950/85 max-lg:to-navy-950/55" />
        <div className="hero-rise site-wrap pb-[calc(5vw+80px)] pt-20 sm:pt-28">
          <p className="site-kicker text-gold-400">Crest STEM Centre</p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(36px,7vw,66px)] font-extrabold leading-[1.03] tracking-[-0.03em]">
            Science and coding, taught hands-on
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-[1.65] text-navy-100 sm:text-xl">
            Laboratory experiments in biology, chemistry and physics, and coding classes from first blocks to Computer Science exams. Here in Nairobi,
            alongside your student’s tuition or homeschooling.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/admissions?interest=stem#enquire" className="btn-gold px-7 py-3.5 text-base font-bold">
              Enquire about STEM
            </Link>
            <a href="#lab" className="btn border-white/50 px-6 py-3.5 text-base font-semibold text-white hover:border-white hover:bg-white/10">
              Science laboratory
            </a>
            <a href="#coding" className="btn border-white/50 px-6 py-3.5 text-base font-semibold text-white hover:border-white hover:bg-white/10">
              Coding classes
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- why */}
      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap">
          <SectionHead kicker="Why STEM at Crest" title="Learning by doing, not only by reading">
            <p>
              Most tuition stops at the textbook. At the STEM Centre students also use the equipment, run the experiment and write the program, so the
              theory they learn in lessons has something real to hold on to.
            </p>
          </SectionHead>
          <ul className="mt-12 grid gap-px border border-line bg-line md:grid-cols-3">
            {WHY.map((w) => (
              <li key={w.title} className="bg-white p-7">
                <span className="grid h-12 w-12 place-items-center bg-navy-800 text-gold-400">
                  <w.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-extrabold text-navy-900">{w.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-navy-700">{w.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- lab */}
      <section id="lab" className="angle-both scroll-mt-32 bg-canvas py-[calc(5vw+64px)]">
        <div className="site-wrap grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[5/4] lg:aspect-[4/5]">
            <div className="cut-right absolute inset-0 overflow-hidden bg-navy-100">
              <Photo k="labGoggles" sizes="(min-width:1024px) 50vw, 100vw" position="center 30%" />
            </div>
            <div className="absolute -bottom-8 right-[6%] aspect-square w-[42%] border-[6px] border-canvas bg-navy-100 shadow-[0_30px_60px_-30px_rgba(10,29,79,0.7)]">
              <div className="relative h-full w-full overflow-hidden">
                <Photo k="labPour" sizes="(min-width:1024px) 22vw, 42vw" />
              </div>
            </div>
            <span className="absolute left-0 top-6 bg-gold-500 px-4 py-2 font-display text-sm font-extrabold text-navy-950">Ages 5 to 18</span>
          </div>
          <div>
            <p className="site-kicker">Science laboratory</p>
            <h2 className="site-h2 mt-3">Real experiments in a working laboratory</h2>
            <p className="site-lead mt-4">
              Younger students explore with simple investigations. Older students carry out the practical work their syllabus sets, with the skills
              examiners look for.
            </p>
            <h3 className="mt-8 font-display text-base font-extrabold text-navy-900">Skills students practise</h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {LAB_SKILLS.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-[15px] text-navy-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
                  {s}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-4 border-l-[3px] border-gold-500 bg-white p-5">
              <Glasses className="mt-0.5 h-6 w-6 shrink-0 text-navy-700" />
              <p className="text-[15px] leading-relaxed text-navy-800">
                <span className="font-bold text-navy-900">Homeschooling or a private candidate?</span> Practical skills are part of IGCSE and A Level
                science. Students without a school lab can learn and rehearse them with us before the exam.
              </p>
            </div>
          </div>
        </div>

        {/* lab notebook: example experiments */}
        <div className="site-wrap mt-24">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="font-display text-2xl font-extrabold text-navy-900 sm:text-[28px]">Experiments students carry out</h3>
            <p className="text-[15px] text-navy-600">A sample. The full list follows each student’s syllabus.</p>
          </div>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {EXPERIMENTS.map((e) => (
              <li key={e.subject} className="border border-line border-t-[4px] border-t-navy-800 bg-white">
                <p className="border-b border-line px-6 py-4 font-display text-lg font-extrabold text-navy-900">{e.subject}</p>
                <ul className="px-6 py-2">
                  {e.items.map((it) => (
                    <li key={it} className="flex gap-3 border-b border-dashed border-line py-3 text-[15px] leading-snug text-navy-800 last:border-b-0">
                      <span className="mt-[7px] h-2 w-2 shrink-0 bg-gold-500" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- coding */}
      <section id="coding" className="scroll-mt-32 bg-navy-900 py-20 text-white sm:py-24">
        <div className="site-wrap grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <p className="site-kicker text-gold-400">Coding and programming</p>
            <h2 className="mt-3 font-display text-[clamp(30px,4.6vw,44px)] font-extrabold leading-[1.08] tracking-[-0.02em]">
              From first blocks to Computer Science exams
            </h2>
            <p className="mt-5 max-w-[54ch] text-[17px] leading-[1.7] text-navy-100">
              Students learn by building: games, websites and programs that solve real problems. Each stage prepares them for the next, so a seven-year-old
              starting with Scratch has a clear route to IGCSE and A Level Computer Science.
            </p>
            <ul className="mt-8 space-y-3 text-[15px]">
              {["Lessons at the centre or live online", "Students keep every project they build", "Progress recorded after every lesson"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 bg-gold-500" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <CodeCard className="lg:rotate-1" />
        </div>
      </section>

      {/* ---------------------------------------------------------------- pathway */}
      <section id="pathway" className="scroll-mt-32 bg-white py-20 sm:py-24">
        <div className="site-wrap">
          <SectionHead kicker="The coding pathway" title="Four stages, each building on the last">
            <p>Students join at the stage that fits their age and experience. We check where they are in the first lesson.</p>
          </SectionHead>
          <ol className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {PATHWAY.map((p, i) => (
              <li key={p.title} className="relative flex flex-col border border-line bg-white">
                <div className="photo-zoom cut-corner relative aspect-[4/3] overflow-hidden bg-navy-100">
                  <Photo k={p.photo} sizes="(min-width:1280px) 300px, (min-width:640px) 50vw, 100vw" />
                  <span className="absolute left-0 top-5 bg-gold-500 px-3 py-1.5 text-[13px] font-bold text-navy-950">{p.ages}</span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm font-semibold text-navy-500">Stage {i + 1}</p>
                  <h3 className="mt-1 font-display text-xl font-extrabold text-navy-900">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{p.body}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                    {p.topics.map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-[14px] text-navy-800">
                        <span className="mt-[6px] h-1.5 w-1.5 shrink-0 bg-navy-800" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/admissions?interest=coding#enquire" className="btn-primary px-6 py-3">
              Enquire about coding classes
            </Link>
            <Link href="/admissions?interest=lab#enquire" className="btn-ghost px-6 py-3">
              Enquire about the science lab
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- how it works */}
      <section className="angle-top bg-navy-800 pb-20 pt-[calc(5vw+64px)] text-white">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <p className="site-kicker text-gold-400">How STEM lessons work</p>
            <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.1] sm:text-[40px]">Part of your student’s Crest timetable</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-navy-100">
              STEM sessions sit in the same weekly timetable as tuition, so parents see them in one place.
            </p>
          </div>
          <dl className="grid gap-px bg-white/15 sm:grid-cols-2">
            {HOW.map((h) => (
              <div key={h.title} className="bg-navy-800 p-6">
                <h.icon className="h-6 w-6 text-gold-400" />
                <dt className="mt-4 font-display text-lg font-extrabold">{h.title}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-navy-100">{h.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <NextSteps />
    </>
  );
}
