import Link from "next/link";
import { BookOpenCheck, CalendarDays, ClipboardList, FileText, Megaphone, Receipt, UserCheck } from "lucide-react";
import { NextSteps, PageHero, SectionHead } from "@/components/site/blocks";
import { ReportPreview } from "@/components/site/ReportPreview";

export const metadata = {
  title: "For parents",
  description: "The Crest parent portal: attendance, lesson topics, homework, weekly reports, timetables, invoices and payments for every learner in your family.",
};

const FEATURES = [
  { icon: CalendarDays, title: "Timetable", body: "Every upcoming lesson for each learner, with times, subjects and teachers." },
  { icon: UserCheck, title: "Attendance", body: "Whether your learner joined each lesson, and whether they were on time." },
  { icon: BookOpenCheck, title: "Lesson records", body: "Topics covered in every lesson and any homework set, with due dates." },
  { icon: FileText, title: "Schoolwork", body: "Worksheets from teachers, what’s been handed in and what’s been marked." },
  { icon: ClipboardList, title: "Weekly reports", body: "A written report from each subject teacher, every week. Print it or save it as a PDF." },
  { icon: Receipt, title: "Invoices and payments", body: "Your invoices, what’s been paid and what’s due, with our payment details." },
  { icon: Megaphone, title: "Announcements", body: "Notices from our office, such as holiday dates and timetable changes." },
];

export default function ParentsPage() {
  return (
    <>
      <PageHero photo="helping" kicker="For parents" title="Stay close to your learner’s progress" position="center 30%">
        <p>Your own sign-in to the Crest parent portal, with everything the teachers record for every learner in your family.</p>
      </PageHero>

      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHead kicker="The parent portal" title="Everything in one private place" />
            <ul className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center bg-navy-800 text-gold-400">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-base font-extrabold text-navy-900">{f.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-navy-700">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative lg:sticky lg:top-40">
            <div className="absolute -inset-4 -z-10 bg-navy-800 sm:-inset-6" style={{ clipPath: "polygon(10% 0, 100% 0, 100% 100%, 0 100%)" }} aria-hidden />
            <div className="lg:-rotate-2">
              <ReportPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="angle-top bg-canvas pb-20 pt-[calc(5vw+64px)]">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHead kicker="Your account" title="Private, secure and set up for you">
              <p>Accounts are created by our office when your learner joins, so only Crest families can sign in.</p>
            </SectionHead>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/portal" className="btn-primary px-6 py-3">
                Parent portal login
              </Link>
              <Link href="/forgot-password" className="btn-ghost px-6 py-3">
                Forgot your password?
              </Link>
            </div>
          </div>
          <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {[
              ["One sign-in for the family", "See every learner you’re responsible for, together or one at a time."],
              ["Private to your family", "You only ever see your own learners’ lessons, reports and invoices."],
              ["Signed out automatically", "For safety, each sign-in ends after three hours, with a warning first."],
              ["Your devices, your control", "See where you’re signed in and sign out any device you don’t recognise."],
            ].map(([t, b]) => (
              <li key={t} className="bg-white p-6">
                <p className="font-display text-lg font-extrabold text-navy-900">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <NextSteps />
    </>
  );
}
