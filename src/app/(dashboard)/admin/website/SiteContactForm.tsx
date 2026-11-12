"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { saveSiteContact } from "@/lib/actions/site";

type Contact = { phone: string; whatsapp: string; email: string; address: string; hours: string; mapUrl: string };

const FIELDS: { key: keyof Contact; label: string; hint?: string; multiline?: boolean; type?: string }[] = [
  { key: "phone", label: "Phone", hint: "e.g. 0712 345 678" },
  { key: "whatsapp", label: "WhatsApp number", hint: "Leave empty if it’s the same as the phone" },
  { key: "email", label: "Email", type: "email", hint: "e.g. office@crestlearning.co.ke" },
  { key: "address", label: "Centre address", multiline: true, hint: "Building, street and area" },
  { key: "hours", label: "Office hours", hint: "e.g. Monday to Friday, 8am to 6pm; Saturday, 9am to 1pm" },
  { key: "mapUrl", label: "Google Maps link", hint: "Open the centre in Google Maps, press Share, copy the link" },
];

export function SiteContactForm({ initial }: { initial: Contact }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<Contact>(initial);
  const changed = JSON.stringify(v) !== JSON.stringify(initial);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSiteContact(v);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        });
      }}
    >
      {FIELDS.map((f) => (
        <label key={f.key} className="block">
          <span className="label">{f.label}</span>
          {f.multiline ? (
            <textarea className="input min-h-[70px]" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ) : (
            <input className="input" type={f.type ?? "text"} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          )}
          {f.hint && <span className="mt-1 block text-xs text-navy-400">{f.hint}</span>}
        </label>
      ))}
      <button type="submit" className="btn-primary" disabled={pending || !changed}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save contact details
      </button>
    </form>
  );
}
