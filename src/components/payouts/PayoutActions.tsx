"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { confirmPayout, undoPayout } from "@/lib/actions/payouts";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());

/** "Confirm payment": how it was paid, the reference and the date. */
export function ConfirmPayout({ teacherId, periodStart, amount, teacherName }: { teacherId: string; periodStart: string; amount: string; teacherName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"MPESA" | "BANK_TRANSFER" | "CASH">("MPESA");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-3.5 w-3.5" /> Confirm payment
      </button>
    );
  }
  return (
    <form
      className="w-full space-y-3 border border-navy-200 bg-white p-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await confirmPayout({ teacherId, periodStart, method, reference: reference || undefined, paidOn, note: note || undefined });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <p className="text-sm font-semibold text-navy-900">
        Confirm {amount} paid to {teacherName}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="label">Paid by</span>
          <select className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
            <option value="MPESA">M-Pesa</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{method === "MPESA" ? "M-Pesa code" : "Reference"}</span>
          <input
            className="input font-mono uppercase"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={method === "MPESA" ? "e.g. SJ71XK3P2Q" : method === "CASH" ? "optional" : "Bank reference"}
            required={method === "MPESA"}
            maxLength={80}
          />
        </label>
        <label className="block">
          <span className="label">Date paid</span>
          <input type="date" className="input" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} required />
        </label>
      </div>
      <label className="block">
        <span className="label">
          Note <span className="font-normal text-navy-400">optional</span>
        </span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm payment
        </button>
      </div>
    </form>
  );
}

export function UndoPayout({ id, amount }: { id: number; amount: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-navy-400 hover:text-rose-700"
      onClick={() => {
        if (!confirm(`Remove the confirmation of ${amount}? Its lessons will show as owed again.`)) return;
        start(async () => {
          const r = await undoPayout(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />} Undo
    </button>
  );
}
