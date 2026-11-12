import Link from "next/link";
import { Building2, House, MonitorPlay } from "lucide-react";
import { ContourPeak } from "@/components/site/ContourPeak";
import { ReportPreview } from "@/components/site/ReportPreview";

export const metadata = {
  title: { absolute: "Crest Learning — tuition and homeschooling in Nairobi" },
  description: "One-to-one tuition and homeschooling in Nairobi across Cambridge, Pearson Edexcel, CBE and IB, from Primary to A Level and the IB Diploma. At our centre, at home or live online.",
};

const WAYS = [
  {
    icon: Building2,
    title: "At the Crest centre",
    body: "A calm, supervised place to work with your teacher, away from the distractions of home.",
  },
  {
    icon: House,
    title: "At home in Nairobi",
    body: "Your teacher comes to you, so lessons fit around the family’s week without the commute.",
  },
  {
    icon: MonitorPlay,
    title: "Live online",
    body: "Face-to-face lessons on Google Meet from anywhere, with the same records and reports as every other lesson.",
  },
];

/** Stage names as each curriculum uses them. Blank where a curriculum doesn’t have that stage. */
const MATRIX: { curriculum: string; stages: (string | null)[] }[] = [
  { curriculum: "Cambridge", stages: ["Cambridge Primary", "Lower Secondary", "IGCSE", "AS and A Level"] },
  { curriculum: "Pearson Edexcel", stages: [null, null, "International GCSE", "International A Level"] },
  { curriculum: "CBE", stages: ["Grades 1–6", "Junior School, Grades 7–9", null, null] },
  { curriculum: "IB", stages: [null, null, null, "IB Diploma"] },
];
const LEVELS = ["Primary", "Lower secondary", "IGCSE and GCSE", "A Level and IB"];

const STEPS = [
  { title: "Tell us about your student", body: "Send an enquiry or call the office. We ask about their curriculum, level, subjects and what they’re aiming for." },
  { title: "We plan the teaching", body: "We match a teacher to each subject and agree a weekly timetable with you, at the centre, at home or online." },
  { title: "Lessons begin, and every one is recorded", body: "After each lesson the teacher records attendance, the topics covered and any homework, the same day." },
  { title: "You hear from us every week", body: "Each subject’s teacher writes a short report: progress, strengths and the focus for the week ahead." },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-800 text-white">
        <div className="site-wrap grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6 lg:py-24">
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(30px,9.4vw,38px)] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[50px]">
              Tuition and homeschooling, planned around one student at a time.
            </h1>
            <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.65] text-navy-100 sm:text-lg">
              Every Crest student has their own teachers and their own timetable, for Cambridge, Pearson Edexcel, CBE and IB, from Primary to A Level and
              the IB Diploma. Learn at our Nairobi centre, at home, or live online.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/admissions#enquire" className="btn-gold px-6 py-3 text-[15px]">
                Enquire about a place
              </Link>
              <Link href="/programmes" className="btn border-white/40 px-6 py-3 text-[15px] text-white hover:border-white hover:bg-white/10">
                Explore programmes
              </Link>
            </div>
          </div>
          <div className="overflow-hidden sm:overflow-visible">
            <ContourPeak className="h-auto w-[142%] max-w-none sm:w-full sm:max-w-full" />
          </div>
        </div>
        <div className="border-t border-white/10 bg-navy-900/50">
          <ul className="site-wrap grid gap-x-8 gap-y-2 py-4 text-sm text-navy-100 sm:grid-cols-3">
            <li>Our centre in Nairobi</li>
            <li>Home tuition across Nairobi</li>
            <li>Live online lessons, anywhere</li>
          </ul>
        </div>
      </section>

      {/* Ways to learn */}
      <section className="bg-white py-20">
        <div className="site-wrap">
          <div>
            <div className="max-w-3xl">
              <h2 className="site-h2">Three ways to learn, one standard of teaching</h2>
              <p className="site-lead mt-4">
                Choose what suits your student and your week. Whichever you choose, lessons come with the same records and weekly reports.
              </p>
            </div>
            <ul className="mt-10 grid border-t-[3px] border-navy-800 md:grid-cols-3">
              {WAYS.map((w, i) => (
                <li key={w.title} className={`py-7 md:px-7 md:first:pl-0 ${i > 0 ? "border-t border-line md:border-l md:border-t-0" : ""}`}>
                  <w.icon className="h-7 w-7 text-gold-600" strokeWidth={1.6} />
                  <h3 className="mt-4 font-display text-xl font-semibold text-navy-900">{w.title}</h3>
                  <p className="mt-2 max-w-[38ch] text-[15px] leading-relaxed text-navy-700">{w.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Curricula × levels */}
      <section className="border-y border-line bg-canvas py-20">
        <div className="site-wrap">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="site-h2">Four curricula, Primary to A Level</h2>
              <p className="site-lead mt-4">Each student is taught to their own curriculum and exam board, at the stage they’re at now.</p>
            </div>
            <Link href="/programmes" className="btn-ghost self-start lg:self-auto">
              See programmes in detail
            </Link>
          </div>
          {/* Phones: one block per curriculum. */}
          <ul className="mt-8 grid gap-3 md:hidden">
            {MATRIX.map((row) => (
              <li key={row.curriculum} className="border border-line border-t-[3px] border-t-navy-800 bg-white p-4">
                <p className="font-display text-lg font-semibold text-navy-900">{row.curriculum}</p>
                <dl className="mt-2 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-x-3 gap-y-1.5 text-sm">
                  {row.stages.map((st, i) =>
                    st ? (
                      <div key={i} className="contents">
                        <dt className="text-navy-500">{LEVELS[i]}</dt>
                        <dd className="text-navy-900">{st}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              </li>
            ))}
          </ul>
          <div className="mt-10 hidden overflow-x-auto border border-line bg-white md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="bg-navy-800 text-white">
                  <th scope="col" className="w-[19%] px-5 py-3.5 font-display text-sm font-semibold">
                    Curriculum
                  </th>
                  {LEVELS.map((l) => (
                    <th key={l} scope="col" className="border-l border-white/10 px-5 py-3.5 font-display text-sm font-semibold">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.curriculum} className="border-t border-line">
                    <th scope="row" className="px-5 py-4 font-display font-semibold text-navy-900">
                      {row.curriculum}
                    </th>
                    {row.stages.map((s, i) => (
                      <td key={i} className="border-l border-line px-5 py-4">
                        {s ? (
                          <span className="flex items-start gap-2.5 text-navy-800">
                            <span className="mt-[7px] h-2 w-2 shrink-0 bg-gold-500" aria-hidden />
                            {s}
                          </span>
                        ) : (
                          <span className="text-navy-200" aria-label="Not offered at this stage">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-navy-600">Moving between curricula, or not sure which suits? Tell us when you enquire and we’ll talk it through.</p>
        </div>
      </section>

      {/* How it starts */}
      <section className="bg-white py-20">
        <div className="site-wrap">
          <h2 className="site-h2 max-w-2xl">From first call to first report</h2>
          <ol className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-white p-6">
                <span className="font-display text-[44px] font-bold leading-none text-gold-500" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold leading-snug text-navy-900">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* For parents */}
      <section className="border-y border-line bg-canvas py-20">
        <div className="site-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="site-h2">Always know how your student is doing</h2>
            <p className="site-lead mt-4">
              Parents have their own sign-in to the Crest portal. Everything the teachers record is there, for every student in the family.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                ["Attendance for every lesson", "Joined, late or missed — recorded automatically for online lessons and confirmed by the teacher."],
                ["Topics, homework and schoolwork", "What was covered, what’s due, and the worksheets your student has handed in."],
                ["A written report every week", "Progress, strengths and next week’s focus, from each subject’s teacher. Easy to print."],
                ["Timetable, invoices and payments", "Upcoming lessons, invoices and payments confirmed by the office, in one place."],
              ].map(([t, b]) => (
                <li key={t} className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-4">
                  <span className="mt-[9px] h-2.5 w-2.5 bg-navy-800" aria-hidden />
                  <div>
                    <p className="font-semibold text-navy-900">{t}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-navy-700">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/parents" className="btn-ghost mt-9">
              More about the parent portal
            </Link>
          </div>
          <ReportPreview />
        </div>
      </section>

      {/* Homeschooling */}
      <section className="bg-white py-20">
        <div className="site-wrap grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 className="site-h2">Homeschooling, with a school’s structure</h2>
            <p className="site-lead mt-4">
              For families who homeschool full time, we build the whole week: a teacher for each subject, a fixed timetable, and one place to follow
              progress across everything your student studies.
            </p>
            <Link href="/homeschooling" className="btn-primary mt-8">
              How homeschooling works at Crest
            </Link>
          </div>
          <dl className="grid content-start gap-px border border-line bg-line sm:grid-cols-2">
            {[
              ["A full weekly timetable", "Every subject at agreed times, so the week has a rhythm."],
              ["Subject specialists", "Each subject taught by its own teacher, not one tutor for everything."],
              ["Records after every lesson", "Topics and homework logged as you go, ready for exam preparation."],
              ["Weekly reports", "Progress across all subjects, gathered in the parent portal."],
            ].map(([t, b]) => (
              <div key={t} className="bg-white p-5">
                <dt className="font-display font-semibold text-navy-900">{t}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-navy-700">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Enquire */}
      <section className="bg-navy-800 text-white">
        <div className="site-wrap flex flex-col gap-8 py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-[28px] font-bold leading-tight sm:text-[34px]">Tell us about your student</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-navy-100">
              A few details are enough to start. The office will come back to you to talk through subjects, teachers and timings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admissions#enquire" className="btn-gold px-6 py-3 text-[15px]">
              Enquire about a place
            </Link>
            <Link href="/contact" className="btn border-white/40 px-6 py-3 text-[15px] text-white hover:border-white hover:bg-white/10">
              Contact the office
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
