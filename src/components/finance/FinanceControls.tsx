"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Ban, CheckCircle2, FilePlus2, Loader2, Send, Trash2, Wallet } from "lucide-react";
import {
  endFeePlan,
  generateMonthlyInvoices,
  issueAllDrafts,
  issueInvoice,
  recordPayment,
  removePayment,
  saveFeePlan,
  savePaymentInstructions,
  voidInvoice,
} from "@/lib/actions/finance";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
type Res = { ok: boolean; error?: string; message?: string };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

export function RecordPayment({ invoiceId, balanceKes }: { invoiceId: number; balanceKes: number }) {
  const { pending, run } = useAction();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(balanceKes));
  const [provider, setProvider] = useState<"MPESA" | "BANK_TRANSFER" | "CASH" | "FLUTTERWAVE">("MPESA");
  const [receipt, setReceipt] = useState("");
  const [phone, setPhone] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");
  if (!open)
    return (
      <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
        <Wallet className="h-4 w-4" /> Record a payment
      </button>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => recordPayment(invoiceId, { amountKes: Number(amount), provider, receipt: receipt || undefined, payerPhone: phone || undefined, paidOn, note: note || undefined }),
          () => setOpen(false),
        );
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Amount (KES)</span>
          <input className="input tabular-nums" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} required />
        </label>
        <label className="block">
          <span className="label">Paid by</span>
          <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
            <option value="MPESA">M-Pesa</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
            <option value="FLUTTERWAVE">Card (Flutterwave)</option>
          </select>
        </label>
        <label className="block">
          <span className="label">{provider === "MPESA" ? "M-Pesa code" : "Receipt / reference"}</span>
          <input className="input font-mono uppercase" value={receipt} onChange={(e) => setReceipt(e.target.value)} required={provider === "MPESA"} maxLength={80} placeholder={provider === "CASH" ? "optional" : ""} />
        </label>
        <label className="block">
          <span className="label">Date paid</span>
          <input type="date" className="input" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value)} required />
        </label>
      </div>
      {provider === "MPESA" && (
        <label className="block">
          <span className="label">
            Paid from phone <span className="font-normal text-navy-400">optional</span>
          </span>
          <input className="input tabular-nums" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" maxLength={20} />
        </label>
      )}
      <label className="block">
        <span className="label">
          Note <span className="font-normal text-navy-400">optional</span>
        </span>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Confirm payment
        </button>
      </div>
    </form>
  );
}

export function RemovePayment({ id, label }: { id: number; label: string }) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-navy-400 hover:text-rose-700"
      onClick={() => confirm(`Remove the payment of ${label}? The balance goes back up.`) && run(() => removePayment(id))}
    >
      Remove
    </button>
  );
}

export function InvoiceStatusActions({ id, status, hasPayments }: { id: number; status: string; hasPayments: boolean }) {
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <button type="button" className="btn-primary" disabled={pending} onClick={() => run(() => issueInvoice(id))}>
          <Send className="h-4 w-4" /> Issue to parent
        </button>
      )}
      {status !== "VOID" && status !== "PAID" && !hasPayments && (
        <button
          type="button"
          className="btn-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm(status === "DRAFT" ? "Delete this draft?" : "Void this invoice? The parent will see it as void.")) return;
            run(
              () => voidInvoice(id),
              () => status === "DRAFT" && router.push("/admin/finance"),
            );
          }}
        >
          {status === "DRAFT" ? <Trash2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />} {status === "DRAFT" ? "Delete draft" : "Void"}
        </button>
      )}
    </div>
  );
}

export function GenerateInvoices({ drafts }: { drafts: number }) {
  const { pending, run } = useAction();
  const now = today();
  const [month, setMonth] = useState(now.slice(0, 7));
  const [dueDay, setDueDay] = useState("5");
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <label className="block">
          <span className="label">Month</span>
          <input type="month" className="input" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Due on day</span>
          <input className="input tabular-nums" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </label>
      </div>
      <button type="button" className="btn-ghost w-full" disabled={pending} onClick={() => run(() => generateMonthlyInvoices(month, Number(dueDay || 5)))}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Draft invoices from fee plans
      </button>
      {drafts > 0 && (
        <button type="button" className="btn-primary w-full" disabled={pending} onClick={() => confirm(`Issue all ${drafts} drafts to parents?`) && run(() => issueAllDrafts())}>
          <Send className="h-4 w-4" /> Issue {drafts} {drafts === 1 ? "draft" : "drafts"}
        </button>
      )}
    </div>
  );
}

export function PaymentInstructionsEditor({ value }: { value: string }) {
  const { pending, run } = useAction();
  const [text, setText] = useState(value);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePaymentInstructions(text));
      }}
    >
      <textarea className="input min-h-[110px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="e.g. M-Pesa Paybill 123456, account: invoice number" />
      <button type="submit" className="btn-ghost w-full" disabled={pending || text === value}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
      </button>
    </form>
  );
}

export function FeePlanEditor({ studentId, plan }: { studentId: string; plan: { name: string; cycle: string; amountKes: number } | null }) {
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(!plan);
  const [name, setName] = useState(plan?.name ?? "Tuition fees");
  const [cycle, setCycle] = useState<"MONTHLY" | "TERMLY" | "PER_SESSION">((plan?.cycle as "MONTHLY") ?? "MONTHLY");
  const [amount, setAmount] = useState(plan ? String(plan.amountKes) : "");
  const cycleLabel = { MONTHLY: "a month", TERMLY: "a term", PER_SESSION: "per lesson" } as Record<string, string>;
  if (!editing && plan)
    return (
      <div className="space-y-3">
        <div className="border border-line bg-ivory px-3 py-2.5">
          <p className="text-sm font-medium text-navy-900">{plan.name}</p>
          <p className="font-display text-lg font-semibold tabular-nums text-navy-900">
            KES {plan.amountKes.toLocaleString("en-KE")} <span className="text-sm font-normal text-navy-500">{cycleLabel[plan.cycle]}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={() => setEditing(true)}>
            Change
          </button>
          <button type="button" className="btn-ghost text-rose-700" disabled={pending} onClick={() => confirm("End this fee plan?") && run(() => endFeePlan(studentId))}>
            End
          </button>
        </div>
      </div>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveFeePlan(studentId, { name, cycle, amountKes: Number(amount) }), () => setEditing(false));
      }}
    >
      <label className="block">
        <span className="label">Plan name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Amount (KES)</span>
          <input className="input tabular-nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} required />
        </label>
        <label className="block">
          <span className="label">Billed</span>
          <select className="input" value={cycle} onChange={(e) => setCycle(e.target.value as typeof cycle)}>
            <option value="MONTHLY">Monthly</option>
            <option value="TERMLY">Per term</option>
            <option value="PER_SESSION">Per lesson</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        {plan && (
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save fee plan
        </button>
      </div>
    </form>
  );
}
