"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitEnquiry, type EnquiryState } from "@/lib/actions/site";
import { INTERESTS } from "@/lib/enquiry-options";

const LEVELS = ["Primary", "Lower secondary / Junior School", "IGCSE / GCSE", "A Level / IB Diploma", "Not sure"];
const CURRICULA = ["Cambridge", "Pearson Edexcel", "CBE", "IB", "Not sure"];
const DELIVERY = [
  { value: "centre", label: "At the Crest centre" },
  { value: "home", label: "At home in Nairobi" },
  { value: "online", label: "Live online" },
  { value: "unsure", label: "Not sure yet" },
];

function Send() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-[15px] sm:w-auto sm:px-8">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send enquiry"}
    </button>
  );
}

function Field({ label, name, error, optional, children }: { label: string; name: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label} {optional && <span className="font-normal text-navy-400">optional</span>}
      </label>
      {children}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function EnquiryForm() {
  const [state, action] = useFormState<EnquiryState, FormData>(submitEnquiry, undefined);
  const fe = state?.fieldErrors ?? {};
  // Links such as /admissions?interest=coding tick the matching STEM box.
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("interest");
    if (v === "stem") setPicked(INTERESTS.map((i) => i.value));
    else if (v && INTERESTS.some((i) => i.value === v)) setPicked([v]);
  }, []);

  if (state?.ok)
    return (
      <div role="status" className="border border-line border-l-4 border-l-emerald-600 bg-white p-6">
        <p className="flex items-center gap-2 font-display text-lg font-semibold text-navy-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" /> Thank you — your enquiry has been sent
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-navy-700">
          The Crest office will get back to you, usually within one working day, to talk about your student and arrange next steps.
        </p>
      </div>
    );

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.error && (
        <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {/* Not for people: an empty field that only bots fill in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-navy-900">About you</legend>
        <div className="sm:col-span-2">
          <Field label="Your name" name="parentName" error={fe.parentName}>
            <input id="parentName" name="parentName" className="input" autoComplete="name" required aria-invalid={!!fe.parentName} />
          </Field>
        </div>
        <Field label="Email" name="email" error={fe.email}>
          <input id="email" name="email" type="email" className="input" autoComplete="email" aria-invalid={!!fe.email} />
        </Field>
        <Field label="Phone or WhatsApp" name="phone" error={fe.phone}>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" placeholder="07…" />
        </Field>
        <p className="-mt-2 text-xs text-navy-500 sm:col-span-2">Give us an email address, a phone number, or both.</p>
      </fieldset>

      <div className="border-t border-line pt-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-display text-base font-semibold text-navy-900">About the student</legend>
        <div className="sm:col-span-2">
          <Field label="Student’s name" name="studentName" optional>
            <input id="studentName" name="studentName" className="input" />
          </Field>
        </div>
        <Field label="Level" name="level" optional>
          <select id="level" name="level" className="input" defaultValue="">
            <option value="">Choose…</option>
            {LEVELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Curriculum" name="curriculum" optional>
          <select id="curriculum" name="curriculum" className="input" defaultValue="">
            <option value="">Choose…</option>
            {CURRICULA.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <span className="label">Where would lessons suit you?</span>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-4">
            {DELIVERY.map((d) => (
              <label key={d.value} className="flex cursor-pointer items-center gap-2.5 bg-white px-3 py-3 text-sm text-navy-800 has-[:checked]:bg-navy-800 has-[:checked]:text-white">
                <input type="radio" name="delivery" value={d.value} className="h-4 w-4 accent-gold-500" />
                {d.label}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <span className="label">
            STEM Centre <span className="font-normal text-navy-400">optional</span>
          </span>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2">
            {INTERESTS.map((i) => (
              <label key={i.value} className="flex cursor-pointer items-center gap-2.5 bg-white px-3 py-3 text-sm text-navy-800 has-[:checked]:bg-navy-800 has-[:checked]:text-white">
                <input
                  type="checkbox"
                  name="interests"
                  value={i.value}
                  checked={picked.includes(i.value)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, i.value] : p.filter((x) => x !== i.value)))}
                  className="h-4 w-4 accent-gold-500"
                />
                Interested in {i.label === "Science laboratory" ? "the science lab" : "coding classes"}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <Field label="Subjects" name="subjects" optional>
            <input id="subjects" name="subjects" className="input" placeholder="e.g. Mathematics, Chemistry, Computer Science" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Anything else we should know?" name="message" optional>
            <textarea id="message" name="message" className="input min-h-[110px]" placeholder="Exams coming up, what’s going well, what’s been difficult, preferred days and times…" />
          </Field>
        </div>
      </fieldset>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-navy-500">We only use these details to reply to your enquiry.</p>
        <Send />
      </div>
    </form>
  );
}
