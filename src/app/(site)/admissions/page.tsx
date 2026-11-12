import { PageIntro } from "@/components/site/PageIntro";
import { EnquiryForm } from "@/components/site/EnquiryForm";

export const metadata = {
  title: "Admissions",
  description: "How to join Crest Learning: send an enquiry, talk to the office, agree a timetable and start lessons.",
};

const STEPS = [
  ["Send an enquiry", "Use the form on this page, or call the office. A few details are enough to start."],
  ["Talk to the office", "We’ll call you to understand your student: curriculum, level, subjects, goals and the setting that suits you."],
  ["Agree teachers and a timetable", "We match a teacher to each subject, agree weekly days and times, and send you the fees for that plan."],
  ["Start lessons", "You receive your parent sign-in, your student receives theirs, and the first lessons go ahead."],
];

export default function AdmissionsPage() {
  return (
    <>
      <PageIntro title="Admissions">
        <p>Students can join at any point in the year. Here’s how it works.</p>
      </PageIntro>

      <section className="bg-white py-16 sm:py-20">
        <div className="site-wrap">
          <h2 className="site-h2">Four steps to the first lesson</h2>
          <ol className="mt-10 grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="bg-white p-6">
                <span className="font-display text-[44px] font-bold leading-none text-gold-500" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-navy-900">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line bg-canvas py-16 sm:py-20">
        <div className="site-wrap grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <div>
            <h2 className="site-h2">Fees</h2>
            <p className="mt-4 text-[16px] leading-[1.65] text-navy-700">
              Fees depend on the subjects, the level and where lessons take place, so we quote for your student’s plan once we’ve spoken.
            </p>
          </div>
          <dl className="grid gap-px border border-line bg-line sm:grid-cols-3">
            {[
              ["Clear invoices", "Each invoice lists what it covers and appears in your parent portal."],
              ["Easy to pay", "Pay by M-Pesa or bank transfer, using the invoice number as the reference."],
              ["Confirmed for you", "The office records each payment, so your balance is always up to date."],
            ].map(([t, b]) => (
              <div key={t} className="bg-white p-5">
                <dt className="font-display font-semibold text-navy-900">{t}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-navy-700">{b}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="enquire" className="scroll-mt-24 bg-white py-16 sm:py-20">
        <div className="site-wrap grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <div>
            <h2 className="site-h2">Enquire about a place</h2>
            <p className="mt-4 text-[16px] leading-[1.65] text-navy-700">
              Tell us a little about your student. Only your name and one way to reach you are needed; everything else helps us prepare for the call.
            </p>
          </div>
          <div className="border border-line border-t-[3px] border-t-navy-800 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(10,29,79,0.4)] sm:p-8">
            <EnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
