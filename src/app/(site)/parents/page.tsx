import Link from "next/link";
import { EnquireBand, PageIntro, Section } from "@/components/site/PageIntro";
import { ReportPreview } from "@/components/site/ReportPreview";

export const metadata = {
  title: "For parents",
  description: "The Crest parent portal: attendance, topics, homework, weekly reports, timetables, invoices and payments for every student in your family.",
};

const FEATURES = [
  ["Timetable", "Every upcoming lesson for each of your students, with times, subjects and teachers."],
  ["Attendance", "Whether your student joined each lesson, and whether they were on time."],
  ["Lesson records", "The topics covered in every lesson and any homework set, with due dates."],
  ["Schoolwork", "Worksheets from teachers, what’s been handed in and what’s been marked."],
  ["Weekly reports", "A written report from each subject’s teacher every week. Print it or save it as a PDF."],
  ["Invoices and payments", "Your invoices, what’s been paid and what’s due, with the office’s payment details."],
  ["Announcements", "Notices from the office, such as holiday dates and timetable changes."],
];

export default function ParentsPage() {
  return (
    <>
      <PageIntro title="For parents">
        <p>You’ll have your own sign-in to the Crest portal, with everything the teachers record for every student in your family.</p>
      </PageIntro>

      <section className="bg-white py-16 sm:py-20">
        <div className="site-wrap grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="site-h2">What you’ll see</h2>
            <dl className="mt-8 divide-y divide-line border-y border-line">
              {FEATURES.map(([t, b]) => (
                <div key={t} className="grid gap-1 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-display font-semibold text-navy-900">{t}</dt>
                  <dd className="text-[15px] leading-relaxed text-navy-700">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="lg:sticky lg:top-28">
            <ReportPreview />
          </div>
        </div>
      </section>

      <Section
        tone="canvas"
        title="Your account"
        intro={<p>Accounts are set up by the Crest office when your student enrols, so only families we teach can sign in.</p>}
      >
        <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {[
            ["One sign-in for the family", "See every student you’re responsible for in one place, together or one at a time."],
            ["Private to your family", "You only ever see your own students’ lessons, reports and invoices."],
            ["Signed out automatically", "For safety, every sign-in ends after three hours, with a warning before it does."],
            ["Your devices, under your control", "See where you’re signed in and sign out any device you don’t recognise."],
          ].map(([t, b]) => (
            <li key={t} className="bg-white p-6">
              <p className="font-display text-lg font-semibold text-navy-900">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/portal" className="btn-primary">
            Portal sign-in
          </Link>
          <Link href="/forgot-password" className="btn-ghost">
            Forgot your password?
          </Link>
        </div>
      </Section>

      <EnquireBand />
    </>
  );
}
