"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { appUrl, emailConfigured } from "@/lib/env";
import { brandedEmail, sendEmail } from "@/lib/email";
import { DELIVERY, EMPTY_CONTACT, INTERESTS, interestLabels, SITE_CONTACT_KEY, getSiteContact, type EnquiryStatus } from "@/lib/site";

/* ------------------------------------------------------------------ public enquiry form */

const EnquiryInput = z
  .object({
    parentName: z.string().trim().min(2, "Enter your name").max(120),
    email: z.string().trim().max(160).email("Check the email address").optional().or(z.literal("")),
    phone: z.string().trim().max(30).optional(),
    studentName: z.string().trim().max(120).optional(),
    level: z.string().trim().max(60).optional(),
    curriculum: z.string().trim().max(60).optional(),
    delivery: z.string().trim().max(20).optional(),
    subjects: z.string().trim().max(300).optional(),
    message: z.string().trim().max(2000).optional(),
  })
  .refine((d) => !!d.email || (d.phone && d.phone.replace(/\D/g, "").length >= 9), { message: "Add an email address or a phone number so we can reply", path: ["email"] });

export type EnquiryState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

export async function submitEnquiry(_: EnquiryState, form: FormData): Promise<EnquiryState> {
  // Bots fill every field; people never see this one.
  if (String(form.get("website") ?? "")) return { ok: true };

  const get = (k: string) => String(form.get(k) ?? "").trim() || undefined;
  const p = EnquiryInput.safeParse({
    parentName: get("parentName") ?? "",
    email: get("email") ?? "",
    phone: get("phone"),
    studentName: get("studentName"),
    level: get("level"),
    curriculum: get("curriculum"),
    delivery: get("delivery"),
    subjects: get("subjects"),
    message: get("message"),
  });
  if (!p.success) return { fieldErrors: Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])) };

  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(`crest:${ip}`).digest("hex").slice(0, 32) : null;
  if (ipHash) {
    const recent = await prisma.enquiry.count({ where: { ipHash, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
    if (recent >= 5) return { error: "We’ve received several enquiries from this connection. Please call or email us instead." };
  }

  const d = p.data;
  const interests = form.getAll("interests").map(String).filter((v) => INTERESTS.some((i) => i.value === v));
  const delivery = DELIVERY.find((x) => x.value === d.delivery)?.value ?? null;
  const row = await prisma.enquiry.create({
    data: {
      parentName: d.parentName,
      email: d.email ? d.email.toLowerCase() : null,
      phone: d.phone || null,
      studentName: d.studentName || null,
      level: d.level || null,
      curriculum: d.curriculum || null,
      delivery,
      subjects: d.subjects || null,
      interests: interests.length ? Array.from(new Set(interests)).join(",") : null,
      message: d.message || null,
      ipHash,
    },
  });

  // Let the office know straight away, if email is set up.
  const contact = await getSiteContact();
  if (emailConfigured() && contact.email) {
    const lines = [
      `From: ${d.parentName}${d.email ? `, ${d.email}` : ""}${d.phone ? `, ${d.phone}` : ""}`,
      d.studentName ? `Student: ${d.studentName}` : "",
      [d.level, d.curriculum, DELIVERY.find((x) => x.value === delivery)?.label].filter(Boolean).join(", "),
      d.subjects ? `Subjects: ${d.subjects}` : "",
      interests.length ? `STEM Centre: ${interestLabels(interests.join(",")).join(", ")}` : "",
      d.message ? `Message: ${d.message}` : "",
    ].filter(Boolean);
    const mail = brandedEmail({
      heading: "New enquiry from the website",
      paragraphs: lines,
      button: { label: "Open enquiries", url: `${appUrl()}/admin/enquiries` },
    });
    await sendEmail({ to: contact.email, subject: `Website enquiry: ${d.parentName}`, ...mail }).catch(() => false);
  }
  revalidatePath("/admin/enquiries");
  void row;
  return { ok: true };
}

/* ------------------------------------------------------------------ office */

export async function updateEnquiry(id: number, data: { status?: EnquiryStatus; notes?: string }) {
  const me = await assertRole("admin");
  await prisma.enquiry.update({
    where: { id },
    data: {
      ...(data.status ? { status: data.status, handledById: me.id } : {}),
      ...(data.notes !== undefined ? { notes: data.notes.trim().slice(0, 2000) || null } : {}),
    },
  });
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin", "layout");
  return { ok: true as const, message: data.status ? "Status updated" : "Notes saved" };
}

export async function deleteEnquiry(id: number) {
  await assertRole("admin");
  await prisma.enquiry.delete({ where: { id } });
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin", "layout");
  return { ok: true as const, message: "Enquiry deleted" };
}

const ContactInput = z.object({
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
  email: z.string().trim().max(160).email("Check the email address").or(z.literal("")),
  address: z.string().trim().max(300),
  hours: z.string().trim().max(200),
  mapUrl: z.string().trim().max(500).url("Paste the full map link, starting with https://").or(z.literal("")),
});

export async function saveSiteContact(input: z.input<typeof ContactInput>) {
  await assertRole("admin");
  const p = ContactInput.safeParse({ ...EMPTY_CONTACT, ...input });
  if (!p.success) return { ok: false as const, error: p.error.issues[0].message };
  await prisma.setting.upsert({ where: { key: SITE_CONTACT_KEY }, update: { value: JSON.stringify(p.data) }, create: { key: SITE_CONTACT_KEY, value: JSON.stringify(p.data) } });
  revalidatePath("/", "layout");
  return { ok: true as const, message: "Website contact details saved" };
}
