import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageHero, SectionHead } from "@/components/site/blocks";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { getSiteContact, telLink, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: "Contact Crest Learning & STEM Centre in Nairobi by phone, WhatsApp or email, or send us a message.",
};

export default async function ContactPage() {
  const c = await getSiteContact();
  const wa = c.whatsapp || c.phone;
  const cards = [
    c.phone && { icon: Phone, label: "Call us", value: c.phone, href: telLink(c.phone) },
    wa && { icon: MessageCircle, label: "WhatsApp", value: c.whatsapp || c.phone, href: whatsappLink(wa), external: true },
    c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    c.address && { icon: MapPin, label: "Visit our centre", value: c.address, href: c.mapUrl || undefined, external: true },
    c.hours && { icon: Clock, label: "Office hours", value: c.hours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string; external?: boolean }[];

  return (
    <>
      <PageHero photo="westlands" kicker="Contact" title="We’d love to hear from you">
        <p>Questions about lessons, fees or an existing learner? Our office is here to help.</p>
      </PageHero>

      {cards.length > 0 && (
        <section className="relative z-10 -mt-[calc(5vw+40px)]">
          <ul className="site-wrap grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.slice(0, 4).map((it) => {
              const inner = (
                <>
                  <span className="grid h-12 w-12 place-items-center bg-navy-800 text-gold-400">
                    <it.icon className="h-6 w-6" />
                  </span>
                  <p className="mt-5 text-sm font-semibold text-navy-500">{it.label}</p>
                  <p className="mt-1 whitespace-pre-line break-words font-display text-lg font-extrabold text-navy-900">{it.value}</p>
                </>
              );
              return (
                <li key={it.label}>
                  {it.href ? (
                    <a
                      href={it.href}
                      {...(it.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="block h-full border border-line border-t-[4px] border-t-gold-500 bg-white p-6 shadow-[0_30px_60px_-34px_rgba(10,29,79,0.6)] transition-colors hover:border-navy-800"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="h-full border border-line border-t-[4px] border-t-gold-500 bg-white p-6 shadow-[0_30px_60px_-34px_rgba(10,29,79,0.6)]">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="bg-white py-20 sm:py-24">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHead kicker="Send a message" title="How can we help?">
              <p>Send us a message and our office will reply by phone or email.</p>
            </SectionHead>
            {c.hours && cards.length > 4 && (
              <p className="mt-6 flex items-center gap-2 text-[15px] text-navy-700">
                <Clock className="h-4 w-4 text-gold-600" /> {c.hours}
              </p>
            )}
            <p className="mt-8 border-l-[3px] border-gold-500 bg-canvas p-5 text-[15px] leading-relaxed text-navy-800">
              Already a Crest family? Lesson details, reports and invoices are always in your parent portal.
            </p>
          </div>
          <div className="cut-corner border border-line border-t-[4px] border-t-navy-800 bg-white p-6 shadow-[0_30px_60px_-36px_rgba(10,29,79,0.55)] sm:p-9">
            <EnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
