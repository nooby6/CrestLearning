import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { getSiteContact, telLink, whatsappLink } from "@/lib/site";
import { SITE_NAV } from "./site-nav";

export async function SiteFooter() {
  const c = await getSiteContact();
  const wa = c.whatsapp || c.phone;
  return (
    <footer className="bg-navy-900 text-navy-100">
      <div className="site-wrap grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <Wordmark tone="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-200">
            One-to-one tuition and homeschooling in Nairobi. Cambridge, Pearson Edexcel, CBE and IB, from Primary to A Level and the IB Diploma.
          </p>
          <p className="mt-6 font-display text-[11px] font-semibold tracking-[0.42em] text-gold-400" aria-hidden>
            LEARN. GROW. EXCEL.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-display text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SITE_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="text-navy-200 hover:text-white hover:underline hover:underline-offset-4">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/portal" className="text-navy-200 hover:text-white hover:underline hover:underline-offset-4">
                Portal sign-in
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">Get in touch</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {c.phone && (
              <li>
                <a href={telLink(c.phone)} className="text-navy-200 hover:text-white">
                  {c.phone}
                </a>
              </li>
            )}
            {wa && (
              <li>
                <a href={whatsappLink(wa)} target="_blank" rel="noreferrer" className="text-navy-200 hover:text-white">
                  WhatsApp us
                </a>
              </li>
            )}
            {c.email && (
              <li>
                <a href={`mailto:${c.email}`} className="break-all text-navy-200 hover:text-white">
                  {c.email}
                </a>
              </li>
            )}
            {c.address && <li className="whitespace-pre-line text-navy-200">{c.address}</li>}
            {c.hours && <li className="text-navy-300">{c.hours}</li>}
            <li>
              <Link href="/admissions#enquire" className="text-gold-400 hover:text-gold-300 hover:underline hover:underline-offset-4">
                Send an enquiry
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="site-wrap flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-navy-300">
          <p>© {new Date().getFullYear()} Crest Learning, Nairobi</p>
          <p>Cambridge, Pearson Edexcel, CBE and IB are the names of their respective curriculum and exam bodies.</p>
        </div>
      </div>
    </footer>
  );
}
