"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, Plus, X } from "lucide-react";
import { createInvoice } from "@/lib/actions/finance";
import { PersonPicker, type PickerOption } from "@/components/ui/PersonPicker";

export type InvoiceStudent = PickerOption & {
  guardians: { id: string; name: string; primary: boolean }[];
  plan: { name: string; amountKes: number; cycle: string } | null;
  subjects: { enrollmentId: number; label: string }[];
};
type Line = { key: number; description: string; quantity: string; unitKes: string; enrollmentId?: number };

const kes = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
let seq = 1;

function monthBounds(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = new Date(y, m + 1, 0).getDate();
  const due = new Date(d.getTime() + 7 * 86400000); // a week to pay
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}`, due: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`, label: d.toLocaleDateString("en-KE", { month: "long", year: "numeric" }) };
}

function linesFor(s: InvoiceStudent | undefined, label: string): Line[] {
  if (!s) return [{ key: seq++, description: "", quantity: "1", unitKes: "" }];
  if (s.plan) return [{ key: seq++, description: `${s.plan.name} — ${label}`, quantity: "1", unitKes: String(s.plan.amountKes) }];
  if (s.subjects.length) return s.subjects.map((x) => ({ key: seq++, description: `${x.label} — ${label}`, quantity: "1", unitKes: "", enrollmentId: x.enrollmentId }));
  return [{ key: seq++, description: `Tuition — ${label}`, quantity: "1", unitKes: "" }];
}

/** The office writes an invoice: pick the student, the bill goes to their primary parent, lines start from their fee plan or subjects. */
export function InvoiceForm({ students, initialStudentId }: { students: InvoiceStudent[]; initialStudentId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const month = useMemo(() => monthBounds(), []);
  const initial = students.find((s) => s.id === initialStudentId);
  const [studentId, setStudentId] = useState(initial?.id ?? "");
  const student = students.find((s) => s.id === studentId);
  const [billToId, setBillToId] = useState(initial?.guardians.find((g) => g.primary)?.id ?? initial?.guardians[0]?.id ?? "");
  const [periodStart, setPeriodStart] = useState(month.start);
  const [periodEnd, setPeriodEnd] = useState(month.end);
  const [dueDate, setDueDate] = useState(month.due);
  const [lines, setLines] = useState<Line[]>(() => linesFor(initial, month.label));
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");

  const pick = (id: string) => {
    setStudentId(id);
    const s = students.find((x) => x.id === id);
    setBillToId(s?.guardians.find((g) => g.primary)?.id ?? s?.guardians[0]?.id ?? "");
    setLines(linesFor(s, month.label));
  };
  const set = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const subtotal = lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitKes) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const submit = (issue: boolean) =>
    start(async () => {
      const r = await createInvoice({
        studentId,
        billToId: billToId || undefined,
        periodStart,
        periodEnd,
        dueDate,
        lines: lines.map((l) => ({ description: l.description, quantity: Number(l.quantity) || 0, unitKes: Number(l.unitKes) || 0, enrollmentId: l.enrollmentId })),
        discountKes: Number(discount) || 0,
        notes: notes || undefined,
        issue,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      router.push(`/admin/finance/${r.data!.id}`);
    });

  return (
    <form className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-6">
        <section className="card">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wide text-navy-900">
              <span aria-hidden className="h-2.5 w-2.5 bg-gold-500" /> Who it’s for
            </h2>
          </header>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <span className="label">Student</span>
              <PersonPicker options={students} value={studentId ? [studentId] : []} onChange={(ids) => pick(ids[0] ?? "")} single placeholder="Search students…" />
            </div>
            <label className="block">
              <span className="label">Bill to</span>
              <select className="input" value={billToId} onChange={(e) => setBillToId(e.target.value)} disabled={!student?.guardians.length}>
                {!student?.guardians.length && <option value="">{student ? "No parent linked" : "Choose a student first"}</option>}
                {student?.guardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                    {g.primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Period from</span>
              <input type="date" className="input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Period to</span>
              <input type="date" className="input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="card">
          <header className="border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-bold uppercase tracking-wide text-navy-900">
              <span aria-hidden className="h-2.5 w-2.5 bg-gold-500" /> Items
            </h2>
          </header>
          <table className="w-full text-sm">
            <thead>
              <tr className="table-head-sub">
                <th className="px-5 py-2">Description</th>
                <th className="w-20 px-2 py-2 text-right">Qty</th>
                <th className="w-32 px-2 py-2 text-right">Unit (KES)</th>
                <th className="w-32 px-2 py-2 text-right">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.key}>
                  <td className="px-5 py-2">
                    <input className="input" value={l.description} onChange={(e) => set(l.key, { description: e.target.value })} placeholder="e.g. Maths tuition — November" maxLength={200} />
                  </td>
                  <td className="px-2 py-2">
                    <input className="input text-right tabular-nums" inputMode="numeric" value={l.quantity} onChange={(e) => set(l.key, { quantity: e.target.value.replace(/\D/g, "") })} />
                  </td>
                  <td className="px-2 py-2">
                    <input className="input text-right tabular-nums" inputMode="decimal" value={l.unitKes} onChange={(e) => set(l.key, { unitKes: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" />
                  </td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{kes((Number(l.quantity) || 0) * (Number(l.unitKes) || 0))}</td>
                  <td className="pr-3 text-right">
                    {lines.length > 1 && (
                      <button type="button" aria-label="Remove line" className="p-1 text-navy-400 hover:text-rose-700" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line px-5 py-3">
            <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-600 hover:text-navy-900" onClick={() => setLines((ls) => [...ls, { key: seq++, description: "", quantity: "1", unitKes: "" }])}>
              <Plus className="h-4 w-4" /> Add a line
            </button>
          </div>
          <div className="border-t border-line px-5 py-4">
            <label className="block">
              <span className="label">
                Note on the invoice <span className="font-normal text-navy-400">optional</span>
              </span>
              <textarea className="input min-h-[70px]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </label>
          </div>
        </section>
      </div>

      <aside className="card lg:sticky lg:top-6">
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="label">Due date</span>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">
              Discount (KES) <span className="font-normal text-navy-400">optional</span>
            </span>
            <input className="input text-right tabular-nums" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
          </label>
          <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-navy-500">Subtotal</dt>
              <dd className="tabular-nums">{kes(subtotal)}</dd>
            </div>
            {Number(discount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-navy-500">Discount</dt>
                <dd className="tabular-nums">−{kes(Math.min(Number(discount), subtotal))}</dd>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-navy-800 pt-2 font-display text-lg font-bold text-navy-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{kes(total)}</dd>
            </div>
          </dl>
        </div>
        <div className="space-y-2 border-t border-line bg-ivory p-5">
          <button type="button" className="btn-primary w-full" disabled={pending || !studentId || total <= 0} onClick={() => submit(true)}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Issue invoice
          </button>
          <button type="button" className="btn-ghost w-full" disabled={pending || !studentId} onClick={() => submit(false)}>
            Save as draft
          </button>
          <p className="text-xs text-navy-500">Issued invoices appear in the parent’s portal straight away.</p>
        </div>
      </aside>
    </form>
  );
}
