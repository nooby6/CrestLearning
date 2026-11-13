import Link from "next/link";
import {
  BookOpenCheck,
  Building2,
  CalendarCheck2,
  ClipboardList,
  FlaskConical,
  GraduationCap,
  House,
  Layers3,
  MapPin,
  MonitorPlay,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AudienceTiles, CurriculaStrip, NextSteps, Photo, ProgrammeCards, SectionHead } from "@/components/site/blocks";
import { ReportPreview } from "@/components/site/ReportPreview";
import { StemFeature } from "@/components/site/stem";

export const metadata = {
  title: { absolute: "Crest Learning & STEM Centre — Homeschooling, tuition, science lab and coding in Nairobi" },
  description:
    "Homeschooling and one-to-one tuition in Nairobi for Cambridge, Pearson Edexcel, CBE and IB learners, from Primary to A Level, with a STEM Centre for laboratory experiments and coding classes.",
};

const FACTS = [
  { icon: Layers3, title: "4 curricula", body: "Cambridge, Pearson Edexcel, CBE and IB" },
  { icon: GraduationCap, title: "Ages 5 to 18", body: "Primary through to A Level and the IB Diploma" },
  { icon: FlaskConical, title: "STEM Centre", body: "Laboratory experiments and coding classes" },
  { icon: ClipboardList, title: "Weekly reports", body: "Written progress for every subject, every week" },
];

const WHY = [
  { icon: UserRound, title: "Truly one-to-one", body: "Every lesson is planned for one learner, at their pace, with nobody to wait for and nowhere to hide." },
  { icon: Users, title: "A specialist for every subject", body: "Each subject has its own teacher who knows the syllabus and the exams inside out." },
  { icon: CalendarCheck2, title: "A timetable that fits", body: "Regular weekly lessons at times agreed with your family, at the centre, at home or online." },
  { icon: BookOpenCheck, title: "Every lesson recorded", body: "Teachers log attendance, topics covered and homework after each lesson, the same day." },
  { icon: ClipboardList, title: "Weekly progress reports", body: "Strengths, progress and next week’s focus, written by each teacher and ready to print." },
  { icon: ShieldCheck, title: "A secure parent portal", body: "Timetables, reports, schoolwork, invoices and payments in one private place for your family." },
];

const WAYS = [
  { icon: Building2, title: "At our Nairobi centre", body: "A calm, supervised study space where learners work with their teachers away from home distractions." },
  { icon: House, title: "Home tuition across Nairobi", body: "Our teachers come to you, so lessons fit around family life without the commute." },
  { icon: MonitorPlay, title: "Live online lessons", body: "Face-to-face lessons on Google Meet from anywhere, with the same records and weekly reports." },
];

export default function HomePage() {
  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="angle-bottom relative isolate overflow-hidden bg-navy-900 text-white">
        <Photo k="desk" sizes="100vw" priority position="65% center" className="-z-20" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-950/95 via-navy-900/85 to-navy-900/25 lg:via-navy-900/70 lg:to-navy-900/10" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-navy-950/70 to-transparent" />
        <div className="site-wrap grid items-end gap-12 pb-[calc(5vw+150px)] pt-20 sm:pt-28 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="hero-rise max-w-2xl">
            <p className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-medium backdrop-blur">
              <MapPin className="h-4 w-4 text-gold-400" /> Nairobi, Kenya
            </p>
            <h1 className="mt-6 font-display text-[clamp(38px,7.4vw,72px)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              Homeschooling, tuition and STEM in Nairobi
            </h1>
            <p className="mt-6 max-w-[54ch] text-lg leading-[1.65] text-navy-100 sm:text-xl">
              One-to-one teaching for Cambridge, Pearson Edexcel, CBE and IB learners, from Primary to A Level, with a STEM Centre for laboratory
              experiments and coding classes.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/admissions#enquire" className="btn-gold px-7 py-3.5 text-base font-bold">
                Enquire now
              </Link>
              <Link href="/stem" className="btn border-white/50 px-7 py-3.5 text-base font-semibold text-white hover:border-white hover:bg-white/10">
                Discover the STEM Centre
              </Link>
            </div>
          </div>
          <aside className="hero-rise hidden border border-white/20 bg-navy-950/55 p-7 backdrop-blur-md lg:block">
            <p className="font-display text-xl font-extrabold">Speak to our admissions team</p>
            <p className="mt-2 text-[15px] leading-relaxed text-navy-100">We’ll help you choose the right curriculum, subjects and way of learning for your learner.</p>
            <ul className="mt-5 space-y-3 text-[15px]">
              {["Advice on curriculum and level", "Matched subject teachers", "A weekly timetable that fits"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 bg-gold-500" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <Link href="/admissions#enquire" className="btn mt-6 w-full border-white bg-white py-3 font-bold text-navy-900 hover:bg-gold-500 hover:text-navy-950">
              Book a conversation
            </Link>
          </aside>
        </div>
      </section>

      {/* Key facts, lifted over the angled edge */}
      <section className="relative z-10 -mt-[calc(5vw+96px)]">
        <ul className="site-wrap grid grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <li
              key={f.title}
              className={`flex flex-col gap-3 border border-line bg-white p-4 sm:flex-row sm:gap-4 sm:p-6 shadow-[0_30px_60px_-34px_rgba(10,29,79,0.6)] ${i === 0 ? "border-t-[4px] border-t-gold-500" : "border-t-[4px] border-t-navy-800"}`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center bg-navy-800 text-gold-400 sm:h-12 sm:w-12">
                <f.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div>
                <p className="font-display text-base font-extrabold text-navy-900 sm:text-lg">{f.title}</p>
                <p className="mt-1 text-[13px] leading-snug text-navy-600 sm:text-sm">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- STEM */}
      <div className="pt-16 sm:pt-20">
        <StemFeature />
      </div>

      {/* ---------------------------------------------------------------- why */}
      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
          <div className="lg:sticky lg:top-40 lg:self-start">
            <SectionHead kicker="Why Crest" title="Why families choose Crest">
              <p>
                Every learner is different, so we don’t teach classes. We build a plan around one learner — their curriculum, their subjects and their
                goals — and give their family a clear view of progress every week.
              </p>
            </SectionHead>
            <div className="relative mt-10 hidden aspect-[4/3] overflow-hidden lg:block">
              <div className="cut-right absolute inset-0">
                <Photo k="classroom" sizes="40vw" />
              </div>
              <div className="absolute bottom-0 right-0 h-2/3 w-3 bg-gold-500" aria-hidden />
            </div>
          </div>
          <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {WHY.map((w) => (
              <li key={w.title}>
                <span className="grid h-14 w-14 place-items-center border-2 border-navy-800 text-navy-800">
                  <w.icon className="h-7 w-7" strokeWidth={1.7} />
                </span>
                <h3 className="mt-5 font-display text-xl font-extrabold text-navy-900">{w.title}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-navy-700">{w.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------------- programmes */}
      <section className="angle-both bg-canvas py-[calc(5vw+64px)]">
        <div className="site-wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHead kicker="What we offer" title="Programmes for every stage">
              <p>From first readers to university applicants, each stage is taught to the learner’s own curriculum and exam board.</p>
            </SectionHead>
            <Link href="/programmes" className="btn-primary self-start px-6 py-3 lg:self-auto">
              View all programmes
            </Link>
          </div>
          <div className="mt-12">
            <ProgrammeCards />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- ways to learn */}
      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[5/4] lg:aspect-[4/5]">
            <div className="cut-right absolute inset-0 overflow-hidden bg-navy-100">
              <Photo k="onlineLesson" sizes="(min-width:1024px) 50vw, 100vw" />
            </div>
            <div className="absolute -bottom-6 left-6 right-[22%] bg-navy-800 p-6 text-white shadow-[0_30px_60px_-30px_rgba(10,29,79,0.8)] sm:left-10">
              <p className="font-display text-lg font-extrabold">The same standard, wherever they learn</p>
              <p className="mt-1 text-sm text-navy-100">Every lesson is recorded and reported in the same way.</p>
            </div>
          </div>
          <div>
            <SectionHead kicker="Learn your way" title="At our centre, at home or online">
              <p>Choose the setting that suits your learner and your week. Talk to us about mixing settings across subjects.</p>
            </SectionHead>
            <ul className="mt-10 space-y-4">
              {WAYS.map((w) => (
                <li key={w.title} className="group flex gap-5 border border-line p-5 transition-colors hover:border-navy-800">
                  <span className="grid h-12 w-12 shrink-0 place-items-center bg-gold-500 text-navy-950 transition-colors group-hover:bg-navy-800 group-hover:text-gold-400">
                    <w.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-extrabold text-navy-900">{w.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-navy-700">{w.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- homeschooling for */}
      <section className="bg-navy-950 py-20 text-white sm:py-24">
        <div className="site-wrap">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="site-kicker text-gold-400">Homeschooling for…</p>
              <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">
                No matter the journey, we’re here to help them thrive
              </h2>
            </div>
            <Link href="/homeschooling" className="btn-gold self-start px-6 py-3 font-semibold lg:self-auto">
              How homeschooling works
            </Link>
          </div>
          <div className="mt-12">
            <AudienceTiles />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- parent portal */}
      <section className="relative overflow-hidden bg-canvas py-20 sm:py-28">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] bg-navy-800 lg:block" style={{ clipPath: "polygon(22% 0, 100% 0, 100% 100%, 0 100%)" }} aria-hidden />
        <div className="site-wrap relative grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHead kicker="For parents" title="Always know how your learner is doing">
              <p>Every Crest family has a private parent portal. Whatever the teachers record, you can see — for every learner in your family.</p>
            </SectionHead>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {["Attendance for every lesson", "Topics covered and homework", "A written report every week", "Invoices and payments"].map((t) => (
                <li key={t} className="flex items-center gap-3 border-l-[3px] border-gold-500 bg-white px-4 py-3 font-semibold text-navy-900">
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/parents" className="btn-primary px-6 py-3">
                Explore the parent portal
              </Link>
              <Link href="/portal" className="btn-ghost px-6 py-3">
                Parent portal login
              </Link>
            </div>
          </div>
          <div className="lg:-rotate-2">
            <ReportPreview />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- curricula */}
      <section className="bg-white pt-20 sm:pt-24">
        <div className="site-wrap">
          <SectionHead kicker="Curricula" title="Taught to the curriculum your learner follows" center>
            <p>Moving between curricula, or not sure which suits? Our admissions team will talk it through with you.</p>
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
