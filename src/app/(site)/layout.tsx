import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { getSiteContact } from "@/lib/site";

/** The public website. Pages are pre-built and refreshed when the office edits contact details. */
export const revalidate = 3600;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const contact = await getSiteContact();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader phone={contact.phone || undefined} />
      <main id="main" className="flex-1 pb-14">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
