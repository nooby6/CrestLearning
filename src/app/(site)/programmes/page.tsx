import Link from "next/link";
import { EnquireBand, PageIntro, Section } from "@/components/site/PageIntro";

export const metadata = {
  title: "Programmes",
  description: "One-to-one teaching for Cambridge, Pearson Edexcel, CBE and IB students in Nairobi, from Primary to A Level and the IB Diploma.",
};

const STAGES = [
  {
    name: "Primary",
    ages: "Roughly ages 5 to 11",
    curricula: ["Cambridge Primary", "CBE, Grades 1 to 6"],
    body: "Secure reading, writing and number work, and the habits that make later study easier: listening, practising, checking work.",
  },
  {
    name: "Lower secondary",
    ages: "Roughly ages 11 to 14",
    curricula: ["Cambridge Lower Secondary", "CBE Junior School, Grades 7 to 9"],
    body: "Broader subjects and more independent work, with gaps closed early so students reach their exam years on firm ground.",
  },
  {
    name: "IGCSE and GCSE",
    ages: "Roughly ages 14 to 16",
    curricula: ["Cambridge IGCSE", "Pearson Edexcel International GCSE"],
    body: "Two-year courses taught to the exam board’s syllabus, with past-paper practice built in well before the exams.",
  },
  {
    name: "A Level and IB Diploma",
    ages: "Roughly ages 16 to 18",
    curricula: ["Cambridge AS and A Level", "Pearson Edexcel International A Level", "IB Diploma"],
    body: "Specialist teaching for the subjects that matter for university, with the depth and exam technique the top grades need.",
  },
];

export default function ProgrammesPage() {
  return (
    <>
      <PageIntro title="Programmes">
        <p>Every student is taught to their own curriculum and exam board, by a teacher for each subject, at the stage they’re at now.</p>
      </PageIntro>

      <section className="bg-white py-16 sm:py-20">
        <div className="site-wrap">
          <h2 className="site-h2">Stages we teach</h2>
          <ol className="mt-10 border-t-[3px] border-navy-800">
            {STAGES.map((s) => (
              <li key={s.name} className="grid gap-4 border-b border-line py-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
                <div>
                  <h3 className="font-display text-2xl font-bold text-navy-900">{s.name}</h3>
                  <p className="mt-1 text-sm text-navy-500">{s.ages}</p>
                </div>
                <ul className="space-y-2">
                  {s.curricula.map((c) => (
                    <li key={c} className="flex items-start gap-2.5 text-[15px] text-navy-800">
                      <span className="mt-[7px] h-2 w-2 shrink-0 bg-gold-500" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="text-[15px] leading-relaxed text-navy-700">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-navy-600">Ages are a guide. Students are placed by the stage they’re working at, not their birthday.</p>
        </div>
      </section>

      <Section
        tone="canvas"
        title="How lessons work"
        intro={<p>The same approach at every stage, whether lessons are at the centre, at home or online.</p>}
      >
        <dl className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {[
            ["One student, one teacher", "Lessons are one-to-one, so the pace and the examples are set by your student."],
            ["A teacher for each subject", "A specialist for each subject your student takes, not one tutor stretched across everything."],
            ["A fixed weekly timetable", "Regular days and times, agreed with you. Lessons usually run for about two hours."],
            ["Records and reports", "Topics and homework recorded after every lesson, and a written report from each teacher every week."],
          ].map(([t, b]) => (
            <div key={t} className="bg-white p-6">
              <dt className="font-display text-lg font-semibold text-navy-900">{t}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Subjects" intro={<p>Tell us the subjects your student takes and we’ll confirm a teacher for each.</p>}>
        <p className="text-[16px] leading-[1.7] text-navy-800">
          We teach the core subjects at every stage — mathematics, English and the sciences — along with the other subjects students take for their
          exams. If your student is following a less common subject or a particular exam board’s syllabus, mention it when you enquire.
        </p>
        <Link href="/admissions#enquire" className="btn-primary mt-7">
          Ask about a subject
        </Link>
      </Section>

      <EnquireBand />
    </>
  );
}
