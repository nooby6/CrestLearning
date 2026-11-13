import "server-only";
import { cache } from "react";
import prisma from "./prisma";

/** Contact details shown on the public website. Edited by the office; anything left empty is simply not shown. */
export type SiteContact = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  mapUrl: string;
};

export const SITE_CONTACT_KEY = "site_contact";
export const EMPTY_CONTACT: SiteContact = { phone: "", whatsapp: "", email: "", address: "", hours: "", mapUrl: "" };

export const getSiteContact = cache(async (): Promise<SiteContact> => {
  const row = await prisma.setting.findUnique({ where: { key: SITE_CONTACT_KEY } }).catch(() => null);
  if (!row) return EMPTY_CONTACT;
  try {
    return { ...EMPTY_CONTACT, ...(JSON.parse(row.value) as Partial<SiteContact>) };
  } catch {
    return EMPTY_CONTACT;
  }
});

/** wa.me wants digits only, with the country code. */
export const whatsappLink = (n: string) => `https://wa.me/${n.replace(/\D/g, "").replace(/^0/, "254")}`;
export const telLink = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export const ENQUIRY_STATUS = {
  NEW: { label: "New", tone: "gold" },
  CONTACTED: { label: "Contacted", tone: "navy" },
  ENROLLED: { label: "Enrolled", tone: "green" },
  CLOSED: { label: "Closed", tone: "slate" },
} as const;
export type EnquiryStatus = keyof typeof ENQUIRY_STATUS;

export const LEVELS = ["Primary", "Lower secondary / Junior School", "IGCSE / GCSE", "A Level / IB Diploma"] as const;
export const CURRICULA = ["Cambridge", "Pearson Edexcel", "CBE", "IB"] as const;
export { INTERESTS, interestLabels } from "./enquiry-options";

export const DELIVERY = [
  { value: "centre", label: "At the Crest centre" },
  { value: "home", label: "At home in Nairobi" },
  { value: "online", label: "Live online" },
  { value: "unsure", label: "Not sure yet" },
] as const;
