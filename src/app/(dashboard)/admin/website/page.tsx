import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSiteContact } from "@/lib/site";
import { Card, PageHeader } from "@/components/ui/primitives";
import { SiteContactForm } from "./SiteContactForm";

export const metadata = { title: "Website" };

export default async function WebsiteSettingsPage() {
  await requireRole("admin");
  const contact = await getSiteContact();
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Website"
        description="Contact details shown on crestlearning.co.ke. Anything left empty isn’t shown."
        actions={
          <Link href="/" target="_blank" className="btn-ghost">
            View the website
          </Link>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card title="Contact details">
          <SiteContactForm initial={contact} />
        </Card>
        <Card title="Where these appear">
          <ul className="space-y-2 text-sm text-navy-700">
            <li>The footer of every page</li>
            <li>The Contact page, with a map link if you add one</li>
            <li>The email address also receives a copy of every website enquiry, once email sending is switched on</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
