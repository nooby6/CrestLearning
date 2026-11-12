import { EnquireBand, PageIntro, Section } from "@/components/site/PageIntro";

export const metadata = {
  title: "Homeschooling",
  description: "Full-time homeschooling in Nairobi with a teacher for each subject, a weekly timetable, lesson records and weekly reports — at our centre, at home or online.",
};

const WEEK = [
  { day: "Mon", items: ["Mathematics", "English"] },
  { day: "Tue", items: ["Biology", "History"] },
  { day: "Wed", items: ["Mathematics", "Chemistry"] },
  { day: "Thu", items: ["English", "Physics"] },
  { day: "Fri", items: ["Geography", "Mathematics"] },
];

export default function HomeschoolingPage() {
  return (
    <>
      <PageIntro title="Homeschooling, with a school’s structure">
        <p>For families who teach at home full time: we build the whole week, with a specialist teacher for each subject and one place to follow progress.</p>
      </PageIntro>

      <Section
        title="Who it suits"
        intro={<p>Families choose to homeschool for many reasons. These are the ones we hear most.</p>}
      >
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {[
            ["Students who learn best one-to-one", "Teaching at their pace, with no waiting for the class and no getting lost in it."],
            ["Young athletes, musicians and performers", "A timetable built around training, rehearsals and competitions."],
            ["Families who move or travel", "Online lessons keep the same teachers and timetable wherever you are."],
            ["Students changing curriculum", "A planned route from one system to another, such as CBE to Cambridge."],
          ].map(([t, b]) => (
            <li key={t} className="bg-white p-6">
              <p className="font-display text-lg font-semibold text-navy-900">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
            </li>
          ))}
        </ul>
      </Section>

      <section className="border-y border-line bg-canvas py-16 sm:py-20">
        <div className="site-wrap grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <div>
            <h2 className="site-h2">What a week looks like</h2>
            <p className="mt-4 text-[16px] leading-[1.65] text-navy-700">
              Each subject has regular slots with its own teacher. Here is an illustration of one student’s week; yours is planned around your student’s
              subjects and your family’s routine.
            </p>
          </div>
          <figure className="m-0 min-w-0">
            <div className="grid border border-line bg-white sm:grid-cols-5">
              {WEEK.map((d, i) => (
                <div key={d.day} className={`grid grid-cols-[64px_minmax(0,1fr)] sm:block ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}>
                  <p className="grid place-items-center bg-navy-800 px-2 py-2 font-display text-sm font-semibold text-white">{d.day}</p>
                  <ul className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-1">
                    {d.items.map((s, j) => (
                      <li key={j} className="border-l-[3px] border-gold-500 bg-ivory px-2.5 py-2 text-[13px] font-medium leading-tight text-navy-900">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <figcaption className="mt-3 text-xs text-navy-500">An illustration. Subjects, days and the number of lessons are planned with each family.</figcaption>
          </figure>
        </div>
      </section>

      <Section title="What’s included">
        <ol className="border-t-[3px] border-navy-800">
          {[
            ["A planned timetable", "We agree the subjects, the weekly slots and where lessons happen: at the centre, at home or online."],
            ["A teacher for each subject", "Subject specialists who know the syllabus and the exams your student is working towards."],
            ["A record after every lesson", "Attendance, topics covered and homework, logged by the teacher the same day."],
            ["Worksheets and schoolwork", "Teachers share worksheets in the portal; students hand work in there and see it marked."],
            ["A report every week", "Each teacher writes a short report on progress, strengths and the next focus."],
            ["One invoice, clear payments", "Invoices in the parent portal, paid by M-Pesa or bank transfer and confirmed by the office."],
          ].map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-b border-line py-5">
              <span className="font-display text-xl font-bold text-gold-600">{i + 1}</span>
              <div>
                <p className="font-display text-lg font-semibold text-navy-900">{t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-navy-700">{b}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="canvas" title="Questions families ask">
        <dl className="divide-y divide-line border-y border-line">
          {[
            ["Can my student switch between home, centre and online?", "Lessons can be planned in whichever setting suits each subject. Talk to us about the mix you have in mind."],
            ["How long are lessons?", "Usually about two hours. We agree lesson lengths and times with you when we plan the timetable."],
            ["How do exams work for homeschooled students?", "Homeschooled students usually sit exams as private candidates at an exam centre. Ask us and we’ll explain the steps and timings."],
            ["How will I know it’s working?", "You can see every lesson’s record and every weekly report in the parent portal, and the office is a message away."],
          ].map(([q, a]) => (
            <div key={q} className="py-5">
              <dt className="font-display text-lg font-semibold text-navy-900">{q}</dt>
              <dd className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-navy-700">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <EnquireBand />
    </>
  );
}
