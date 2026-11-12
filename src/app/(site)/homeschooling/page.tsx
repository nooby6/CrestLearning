import Link from "next/link";
import { AudienceTiles, NextSteps, PageHero, Photo, SectionHead } from "@/components/site/blocks";

export const metadata = {
  title: "Homeschooling",
  description: "Structured homeschooling in Nairobi: a specialist teacher for every subject, a weekly timetable, lesson records and weekly reports — at our centre, at home or online.",
};

const WEEK = [
  { day: "Monday", items: ["Mathematics", "English"] },
  { day: "Tuesday", items: ["Biology", "History"] },
  { day: "Wednesday", items: ["Mathematics", "Chemistry"] },
  { day: "Thursday", items: ["English", "Physics"] },
  { day: "Friday", items: ["Geography", "Mathematics"] },
];

const INCLUDED = [
  ["A planned timetable", "We agree the subjects, the weekly slots and where lessons happen: at our centre, at home or online."],
  ["A teacher for each subject", "Specialists who know the syllabus and the exams your learner is working towards."],
  ["A record after every lesson", "Attendance, topics covered and homework, logged by the teacher the same day."],
  ["Worksheets and schoolwork", "Teachers share worksheets in the portal; learners hand work in there and see it marked."],
  ["A report every week", "Each teacher writes a short report on progress, strengths and the next focus."],
  ["Clear invoices", "Invoices in the parent portal, paid by M-Pesa or bank transfer and confirmed by our office."],
];

export default function HomeschoolingPage() {
  return (
    <>
      <PageHero photo="homeStudy" kicker="Homeschooling" title="Structured homeschooling in Nairobi" position="center 35%">
        <p>Wherever they learn, at a pace that suits them. We plan the whole week, with a specialist teacher for every subject and one place to follow progress.</p>
      </PageHero>

      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHead kicker="Why homeschool with Crest" title="The freedom of homeschooling, with a school’s structure">
              <p>
                Homeschooling gives your learner time to go deeper, move faster or slow down where they need to. Crest adds what’s hard to do alone: subject
                specialists, a dependable timetable and a clear record of progress.
              </p>
            </SectionHead>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {["Subject specialists", "A dependable timetable", "Exam-board syllabuses", "Weekly progress reports"].map((t) => (
                <li key={t} className="border-l-[3px] border-gold-500 bg-canvas px-4 py-3 font-semibold text-navy-900">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[4/3]">
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0 100%)" }}>
              <Photo k="helping" sizes="(min-width:1024px) 50vw, 100vw" />
            </div>
            <div className="absolute -bottom-5 left-[6%] h-3 w-1/2 bg-gold-500" aria-hidden />
          </div>
        </div>
      </section>

      <section id="who" className="scroll-mt-32 bg-navy-950 py-20 text-white sm:py-24">
        <div className="site-wrap">
          <p className="site-kicker text-gold-400">Who it’s for</p>
          <h2 className="mt-3 max-w-3xl font-display text-[30px] font-extrabold leading-[1.1] sm:text-[40px]">Homeschooling for every kind of learner</h2>
          <div className="mt-12">
            <AudienceTiles />
          </div>
        </div>
      </section>

      <section id="week" className="scroll-mt-32 bg-canvas py-20 sm:py-24">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHead kicker="A week at Crest" title="What a homeschool week looks like">
            <p>Each subject has regular slots with its own teacher. Here’s an example of one learner’s week; yours is planned around their subjects and your family’s routine.</p>
          </SectionHead>
          <figure className="m-0 min-w-0">
            <div className="grid border border-line bg-white shadow-[0_30px_60px_-36px_rgba(10,29,79,0.5)] sm:grid-cols-5">
              {WEEK.map((d, i) => (
                <div key={d.day} className={`grid grid-cols-[96px_minmax(0,1fr)] sm:block ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                  <p className="grid place-items-center bg-navy-800 px-2 py-3 font-display text-sm font-bold text-white">
                    <span className="sm:hidden">{d.day}</span>
                    <span className="hidden sm:inline">{d.day.slice(0, 3)}</span>
                  </p>
                  <ul className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-1">
                    {d.items.map((s, j) => (
                      <li key={j} className="border-l-[3px] border-gold-500 bg-ivory px-3 py-3 text-[13px] font-semibold leading-tight text-navy-900">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <figcaption className="mt-3 text-sm text-navy-500">An example. Subjects, days and the number of lessons are planned with each family.</figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap">
          <SectionHead kicker="What’s included" title="Everything a homeschool week needs" center />
          <ol className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {INCLUDED.map(([t, b], i) => (
              <li key={t} className="bg-white p-7">
                <span className="font-display text-4xl font-extrabold text-gold-500">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 font-display text-lg font-extrabold text-navy-900">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-canvas py-20 sm:py-24">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <SectionHead kicker="Questions" title="Questions families ask">
            <p>
              Something else on your mind?{" "}
              <Link href="/contact" className="font-semibold text-navy-900 underline underline-offset-4">
                Get in touch
              </Link>
              .
            </p>
          </SectionHead>
          <div className="divide-y divide-line border-y border-line bg-white">
            {[
              ["Can my learner switch between home, centre and online?", "Lessons can be planned in whichever setting suits each subject. Talk to us about the mix you have in mind."],
              ["How long are lessons?", "Usually about two hours. We agree lesson lengths and times with you when we plan the timetable."],
              ["How do exams work for homeschooled learners?", "Homeschooled learners usually sit exams as private candidates at an exam centre. We’ll explain the steps and timings."],
              ["How will I know it’s working?", "Every lesson record and weekly report is in your parent portal, and our office is a message away."],
            ].map(([q, a]) => (
              <details key={q} className="group px-6 py-5 open:bg-ivory">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-extrabold text-navy-900">
                  {q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center bg-navy-800 text-lg font-bold text-white transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-navy-700">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <NextSteps />
    </>
  );
}
