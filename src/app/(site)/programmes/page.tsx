import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { CurriculaStrip, NextSteps, PROGRAMMES, PageHero, Photo, SectionHead } from "@/components/site/blocks";

export const metadata = {
  title: "Programmes",
  description: "One-to-one teaching for Cambridge, Pearson Edexcel, CBE and IB learners in Nairobi: Primary, Lower Secondary, IGCSE and GCSE, A Level and the IB Diploma.",
};

const FOCUS: Record<string, string[]> = {
  primary: ["Reading fluency and comprehension", "Number sense and mental maths", "Handwriting and clear written work", "Good habits: listening, practising, checking"],
  "lower-secondary": ["A secure foundation in every core subject", "More independent study and note-taking", "Early help with anything that’s slipping", "Confidence before the exam years"],
  igcse: ["Teaching to the exam board’s syllabus", "Past-paper practice from the start", "Exam technique and timing", "Revision plans before mocks and finals"],
  "a-level": ["Specialist subject teachers", "Depth for the top grades", "Coursework and extended essay guidance", "Preparation for university applications"],
};

export default function ProgrammesPage() {
  return (
    <>
      <PageHero photo="classroom" kicker="Programmes" title="A programme for every stage, from Primary to A Level">
        <p>Each learner is taught to their own curriculum and exam board, by a specialist teacher for every subject.</p>
      </PageHero>

      <section className="bg-white py-16 sm:py-20">
        <div className="site-wrap">
          <nav aria-label="Stages" className="flex flex-wrap gap-2">
            {PROGRAMMES.map((p) => (
              <a key={p.id} href={`#${p.id}`} className="border border-line px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-navy-800 hover:bg-navy-800 hover:text-white">
                {p.title} <span className="font-normal text-navy-400">{p.ages.replace("Ages ", "")}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {PROGRAMMES.map((p, i) => (
        <section key={p.id} id={p.id} className={`scroll-mt-32 py-16 sm:py-20 ${i % 2 ? "bg-canvas" : "bg-white"}`}>
          <div className={`site-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div className="relative aspect-[4/3]">
              <div className={`absolute inset-0 overflow-hidden bg-navy-100 ${i % 2 ? "" : "cut-right"}`} style={i % 2 ? { clipPath: "polygon(14% 0, 100% 0, 100% 100%, 0 100%)" } : undefined}>
                <Photo k={p.photo} sizes="(min-width:1024px) 50vw, 100vw" />
              </div>
              <span className={`absolute top-6 bg-gold-500 px-4 py-2 font-display text-sm font-extrabold text-navy-950 ${i % 2 ? "right-0" : "left-0"}`}>{p.ages}</span>
            </div>
            <div>
              <p className="site-kicker">Stage {i + 1} of 4</p>
              <h2 className="site-h2 mt-3">{p.title}</h2>
              <p className="site-lead mt-4">{p.body}</p>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="font-display text-base font-extrabold text-navy-900">Curricula</h3>
                  <ul className="mt-3 space-y-2">
                    {p.curricula.map((c) => (
                      <li key={c} className="flex items-start gap-2.5 text-[15px] text-navy-800">
                        <span className="mt-[7px] h-2 w-2 shrink-0 bg-gold-500" aria-hidden />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-navy-900">What we focus on</h3>
                  <ul className="mt-3 space-y-2">
                    {FOCUS[p.id].map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[15px] text-navy-800">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Link href="/admissions#enquire" className="btn-primary mt-9 px-6 py-3">
                Enquire about {p.title}
              </Link>
            </div>
          </div>
        </section>
      ))}

      <section className="angle-top bg-navy-800 pb-20 pt-[calc(5vw+64px)] text-white">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <p className="site-kicker text-gold-400">How lessons work</p>
            <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.1] sm:text-[40px]">The same approach at every stage</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-navy-100">Whether lessons are at our centre, in your home or online.</p>
          </div>
          <dl className="grid gap-px bg-white/15 sm:grid-cols-2">
            {[
              ["One learner, one teacher", "Lessons are one-to-one, so the pace and examples are set by your learner."],
              ["A specialist for each subject", "A dedicated teacher for every subject, not one tutor stretched across everything."],
              ["A fixed weekly timetable", "Regular days and times agreed with you. Lessons usually run for about two hours."],
              ["Records and weekly reports", "Topics and homework recorded after every lesson, and a written report every week."],
            ].map(([t, b]) => (
              <div key={t} className="bg-navy-800 p-6">
                <dt className="font-display text-lg font-extrabold">{t}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-navy-100">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-white pt-20">
        <div className="site-wrap">
          <SectionHead kicker="Curricula" title="Curricula we teach" center>
            <p>Tell us which subjects your learner takes and we’ll confirm a specialist teacher for each.</p>
          </SectionHead>
          <div className="mt-12">
            <CurriculaStrip />
          </div>
        </div>
      </section>
      <NextSteps />
    </>
  );
}
