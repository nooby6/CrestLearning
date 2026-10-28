"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { Hand, Loader2, X } from "lucide-react";
import { addComment } from "@/lib/actions/work";

/** "Ask for more worksheets" — goes to the teacher of the chosen subject as a request they can tick off. */
export function RequestWorksheet({ options, label = "Request more worksheets" }: { options: { id: number; label: string }[]; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enrollmentId, setEnrollmentId] = useState(options.length === 1 ? String(options[0].id) : "");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  if (!options.length) return null;

  const send = () =>
    start(async () => {
      const r = await addComment({
        enrollmentId: Number(enrollmentId),
        body,
        kind: "REQUEST",
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setOpen(false);
      setBody("");
      router.refresh();
    });

  return (
    <>
      <button type="button" className="btn-gold" onClick={() => setOpen(true)}>
        <Hand className="h-4 w-4" /> {label}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
            <div className="fade-in absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <form
              className="fade-in relative w-full max-w-md rounded-2xl bg-white p-5 text-navy-900 shadow-2xl"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                <Hand className="h-5 w-5" />
              </span>
              <h2 className="font-display text-base font-semibold">Ask for more worksheets</h2>
              <p className="mt-0.5 text-xs text-navy-500">Your teacher gets the request and can share a worksheet with you.</p>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="label">Subject</span>
                  <select className="input" value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} required>
                    <option value="">Choose…</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">What would you like to practise?</span>
                  <textarea
                    className="input min-h-[96px]"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="e.g. More questions on simultaneous equations, please."
                    required
                    maxLength={2000}
                  />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={pending || !enrollmentId || !body.trim()}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />} Send request
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
