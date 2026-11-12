import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageIntro } from "@/components/site/PageIntro";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { getSiteContact, telLink, whatsappLink } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: "Contact the Crest Learning office in Nairobi by phone, WhatsApp or email, or send an enquiry.",
};

export default async function ContactPage() {
  const c = await getSiteContact();
  const wa = c.whatsapp || c.phone;
  const items = [
    c.phone && { icon: Phone, label: "Call", value: c.phone, href: telLink(c.phone) },
    wa && { icon: MessageCircle, label: "WhatsApp", value: c.whatsapp || c.phone, href: whatsappLink(wa), external: true },
    c.email && { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    c.address && { icon: MapPin, label: "Centre", value: c.address, href: c.mapUrl || undefined, external: true, cta: c.mapUrl ? "Open in Google Maps" : undefined },
    c.hours && { icon: Clock, label: "Office hours", value: c.hours },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href?: string; external?: boolean; cta?: string }[];

  return (
    <>
      <PageIntro title="Contact">
        <p>Questions about lessons, fees or an existing student? The office is here to help.</p>
      </PageIntro>
      <section className="bg-white py-16 sm:py-20">
        <div className="site-wrap grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 className="site-h2">Reach the office</h2>
            {items.length ? (
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {items.map((it) => (
                  <li key={it.label} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 py-4">
                    <span className="grid h-10 w-10 place-items-center bg-navy-800 text-white">
                      <it.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-navy-500">{it.label}</p>
                      {it.href && !it.cta ? (
                        <a
                          href={it.href}
                          {...(it.external ? { target: "_blank", rel: "noreferrer" } : {})}
                          className="break-words font-medium text-navy-900 underline-offset-4 hover:underline"
                        >
                          {it.value}
                        </a>
                      ) : (
                        <p className="whitespace-pre-line font-medium text-navy-900">{it.value}</p>
                      )}
                      {it.cta && it.href && (
                        <a href={it.href} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-gold-700 underline-offset-4 hover:underline">
                          {it.cta}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[16px] leading-[1.65] text-navy-700">Send us a message with the form and the office will reply by phone or email.</p>
            )}
            <p className="mt-8 text-[15px] leading-relaxed text-navy-700">
              Already a Crest family? Messages about a current student are quickest through the office, and lesson details are always in the parent
              portal.
            </p>
          </div>
          <div>
            <h2 className="site-h2">Send a message</h2>
            <div className="mt-8 border border-line border-t-[3px] border-t-navy-800 bg-white p-5 shadow-[0_18px_40px_-28px_rgba(10,29,79,0.4)] sm:p-8">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
