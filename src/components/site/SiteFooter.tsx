import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { getSiteContact, telLink, whatsappLink } from "@/lib/site";
import { SITE_NAV } from "./site-nav";

export async function SiteFooter() {
  const c = await getSiteContact();
  const wa = c.whatsapp || c.phone;
  const programmes = SITE_NAV.find((g) => g.label === "Programmes")!.items!;
  return (
    <footer className="bg-navy-950 text-navy-100">
      {/* Enquiry band sits on the footer's top edge. */}
      <div className="site-wrap">
        <div className="relative -top-14 flex flex-col gap-6 bg-gold-500 px-7 py-8 text-navy-950 shadow-[0_30px_60px_-30px_rgba(3,11,36,0.8)] md:flex-row md:items-center md:justify-between md:px-10">
          <div>
            <p className="font-display text-2xl font-extrabold leading-tight sm:text-[28px]">Your learner’s journey starts here</p>
            <p className="mt-1.5 text-[15px] text-navy-900">Tell us about them and our admissions team will be in touch.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admissions#enquire" className="btn border-navy-950 bg-navy-950 px-6 py-3 font-semibold text-white hover:bg-navy-800">
              Enquire now
            </Link>
            <Link href="/contact" className="btn border-navy-950 px-6 py-3 font-semibold text-navy-950 hover:bg-navy-950/10">
              Contact us
            </Link>
          </div>
        </div>
      </div>

      <div className="site-wrap grid gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark tone="light" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy-200">
            Homeschooling and one-to-one tuition in Nairobi for Cambridge, Pearson Edexcel, CBE and IB learners, from Primary to A Level.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {c.phone && (
              <li>
                <a href={telLink(c.phone)} className="flex items-center gap-2.5 text-navy-100 hover:text-white">
                  <Phone className="h-4 w-4 text-gold-400" /> {c.phone}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={whatsappLink(wa)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-navy-100 hover:text-white">
                  <MessageCircle className="h-4 w-4 text-gold-400" /> WhatsApp us
                </a>
              </li>
            )}
            {c.email && (
              <li>
                <a href={`mailto:${c.email}`} className="flex items-center gap-2.5 break-all text-navy-100 hover:text-white">
                  <Mail className="h-4 w-4 shrink-0 text-gold-400" /> {c.email}
                </a>
              </li>
            )}
            {c.address && (
              <li className="flex gap-2.5 text-navy-100">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span className="whitespace-pre-line">{c.address}</span>
              </li>
            )}
          </ul>
        </div>
        <FooterCol title="Programmes" links={[...programmes.map((p) => ({ href: p.href, label: p.label })), { href: "/homeschooling", label: "Homeschooling" }]} />
        <FooterCol
          title="Admissions"
          links={[
            { href: "/admissions", label: "How to join" },
            { href: "/admissions#fees", label: "Fees and payment" },
            { href: "/admissions#enquire", label: "Enquire now" },
            { href: "/parents", label: "For parents" },
            { href: "/contact", label: "Contact us" },
          ]}
        />
        <FooterCol
          title="Portals"
          links={[
            { href: "/portal", label: "Parent portal login" },
            { href: "/portal", label: "Student login" },
            { href: "/portal", label: "Teacher login" },
            { href: "/forgot-password", label: "Forgot your password?" },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="site-wrap flex flex-col gap-2 py-6 text-xs text-navy-300 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Crest Learning, Nairobi, Kenya</p>
          <p className="font-display font-semibold tracking-[0.35em] text-gold-400">LEARN. GROW. EXCEL.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display text-[15px] font-bold text-white">{title}</h2>
      <span className="mt-2 block h-[3px] w-8 bg-gold-500" aria-hidden />
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-navy-200 hover:text-white hover:underline hover:underline-offset-4">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
