import { CreditCard, FileCheck2, Smartphone } from "lucide-react";
import { PageHero, Photo, SectionHead } from "@/components/site/blocks";
import { EnquiryForm } from "@/components/site/EnquiryForm";

export const metadata = {
  title: "Admissions",
  description: "Join Crest Learning at any point in the year: send an enquiry, speak to our admissions team, agree teachers and a timetable, and start lessons.",
};

const STEPS = [
  ["Send an enquiry", "Use the form below or call our office. A few details are enough to start."],
  ["Speak to admissions", "We’ll call to understand your learner: curriculum, level, subjects, goals and the setting that suits you."],
  ["Agree teachers and a timetable", "We match a specialist to each subject, agree weekly days and times, and send the fees for that plan."],
  ["Start lessons", "You receive your parent portal sign-in, your learner receives theirs, and lessons begin."],
];

export default function AdmissionsPage() {
  return (
    <>
      <PageHero photo="graduateMan" kicker="Admissions" title="Admissions are open all year round" position="center 25%">
        <p>Learners can join at any point in the year. Here’s how it works, from your first enquiry to the first lesson.</p>
      </PageHero>

      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap">
          <SectionHead kicker="How to join" title="Four steps to the first lesson" center />
          <ol className="relative mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span className="absolute left-0 right-0 top-7 hidden h-[3px] bg-line lg:block" aria-hidden />
            {STEPS.map(([t, b], i) => (
              <li key={t} className="relative">
                <span className="relative grid h-14 w-14 place-items-center bg-navy-800 font-display text-2xl font-extrabold text-gold-400 ring-8 ring-white">{i + 1}</span>
                <h3 className="mt-6 font-display text-xl font-extrabold text-navy-900">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="fees" className="angle-both scroll-mt-32 bg-navy-800 py-[calc(5vw+56px)] text-white">
        <div className="site-wrap grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <p className="site-kicker text-gold-400">Fees and payment</p>
            <h2 className="mt-3 font-display text-[30px] font-extrabold leading-[1.1] sm:text-[40px]">A quote for your learner’s plan</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-navy-100">
              Fees depend on the subjects, the level and where lessons take place, so we quote for your learner’s plan once we’ve spoken.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileCheck2, t: "Clear invoices", b: "Each invoice lists what it covers and appears in your parent portal." },
              { icon: Smartphone, t: "Pay by M-Pesa", b: "Or by bank transfer, using the invoice number as the reference." },
              { icon: CreditCard, t: "Confirmed for you", b: "Our office records each payment, so your balance is always current." },
            ].map((x) => (
              <li key={x.t} className="border border-white/15 bg-white/5 p-5">
                <x.icon className="h-7 w-7 text-gold-400" />
                <p className="mt-4 font-display font-extrabold">{x.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-navy-100">{x.b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="enquire" className="scroll-mt-32 bg-white py-20 sm:py-24">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHead kicker="Enquire now" title="Tell us about your learner">
              <p>Only your name and one way to reach you are needed. Everything else helps us prepare for the call.</p>
            </SectionHead>
            <div className="relative mt-10 hidden aspect-[4/5] lg:block">
              <div className="cut-right absolute inset-0 overflow-hidden">
                <Photo k="examPrep" sizes="35vw" />
              </div>
              <div className="absolute bottom-8 left-0 right-[20%] bg-gold-500 p-5 text-navy-950">
                <p className="font-display text-lg font-extrabold">We reply to every enquiry</p>
                <p className="mt-1 text-sm">By phone or email, whichever you prefer.</p>
              </div>
            </div>
          </div>
          <div className="cut-corner border border-line border-t-[4px] border-t-navy-800 bg-white p-6 shadow-[0_30px_60px_-36px_rgba(10,29,79,0.55)] sm:p-9">
            <EnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
