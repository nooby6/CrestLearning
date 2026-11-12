"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, Trash2 } from "lucide-react";
import { deleteEnquiry, updateEnquiry } from "@/lib/actions/site";

const OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function EnquiryControls({ id, status, notes }: { id: number; status: (typeof OPTIONS)[number]["value"]; notes: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(notes);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      router.refresh();
    });
  return (
    <div className="space-y-2 border border-line bg-ivory p-3">
      <label className="block">
        <span className="label">Status</span>
        <select className="input" value={status} disabled={pending} onChange={(e) => run(() => updateEnquiry(id, { status: e.target.value as typeof status }))}>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Office notes</span>
        <textarea className="input min-h-[70px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Called on Tuesday, trial lesson booked…" />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" disabled={pending || text === notes} onClick={() => run(() => updateEnquiry(id, { notes: text }))}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save notes
        </button>
        <button
          type="button"
          aria-label="Delete enquiry"
          className="btn-ghost px-2.5 text-navy-400 hover:text-rose-700"
          disabled={pending}
          onClick={() => confirm("Delete this enquiry?") && run(() => deleteEnquiry(id))}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
