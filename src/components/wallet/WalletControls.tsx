"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import clsx from "clsx";
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Pencil, RefreshCw, Send, Smartphone, WalletCards } from "lucide-react";
import { addToWallet, checkWalletStatus, payAllFromWallet, payFromWallet, saveTeacherPayoutDetails, takeFromWallet, topUpWithMpesa } from "@/lib/actions/wallet";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
const METHODS = [
  { value: "MPESA", label: "M-Pesa" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "CARD", label: "Card" },
  { value: "CASH", label: "Cash" },
] as const;
type Method = (typeof METHODS)[number]["value"];

/** M-Pesa prompt to a phone; the money lands in the school's IntaSend account. */
function MpesaTopUp() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await topUpWithMpesa({ amount: Number(amount), phone });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setAmount("");
          router.refresh();
        });
      }}
    >
      <p className="text-sm text-navy-600">The phone gets an M-Pesa prompt. Once its owner enters their PIN, the money goes into the school’s IntaSend account and shows here.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Amount (KES)</span>
          <input className="input text-lg font-semibold tabular-nums" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 50000" required />
        </label>
        <label className="block">
          <span className="label">M-Pesa number paying</span>
          <input className="input font-mono" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required />
        </label>
      </div>
      <button type="submit" className="btn-primary w-full justify-center sm:w-auto" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Send M-Pesa prompt
      </button>
    </form>
  );
}

/** Settles anything IntaSend has finished. */
export function CheckWalletStatus() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost px-3 py-1.5 text-xs"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await checkWalletStatus();
          toast.info(r.ok ? r.message : r.error);
          router.refresh();
        })
      }
    >
      <RefreshCw className={clsx("h-3.5 w-3.5", pending && "animate-spin")} /> Check for updates
    </button>
  );
}

/** Add money to the wallet, or take some out. With IntaSend connected, M-Pesa top-ups come first. */
export function WalletMoneyForm({ mpesa = false }: { mpesa?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"mpesa" | "in" | "out">(mpesa ? "mpesa" : "in");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("MPESA");
  const [reference, setReference] = useState("");
  const [on, setOn] = useState(today());
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const out = mode === "out";

  return (
    <div>
      <div className={clsx("mb-5 grid gap-px border border-line bg-line", mpesa ? "sm:grid-cols-3" : "grid-cols-2")} role="tablist">
        {(
          [
            ...(mpesa ? ([["mpesa", "Top up with M-Pesa", Smartphone]] as const) : []),
            ["in", mpesa ? "Record money added" : "Add money", ArrowDownToLine],
            ["out", "Take money out", ArrowUpFromLine],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={clsx("flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold transition-colors", mode === m ? "bg-navy-800 text-white" : "bg-white text-navy-700 hover:bg-ivory")}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
      {mode === "mpesa" ? (
        <MpesaTopUp />
      ) : (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const input = { amount: Number(amount), method, reference: reference || undefined, on, note: note || undefined };
            const r = out ? await takeFromWallet(input) : await addToWallet(input);
            if (!r.ok) return void toast.error(r.error);
            toast.success(r.message);
            setAmount("");
            setReference("");
            setNote("");
            router.refresh();
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="label">Amount (KES)</span>
            <input
              className="input text-lg font-semibold tabular-nums"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="e.g. 150000"
              required
            />
          </label>
          <label className="block">
            <span className="label">{out ? "Sent by" : "Received by"}</span>
            <select className="input" value={method} onChange={(e) => setMethod(e.target.value as Method)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">
              {method === "MPESA" ? "M-Pesa code" : "Reference"} <span className="font-normal text-navy-400">optional</span>
            </span>
            <input className="input font-mono uppercase" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} />
          </label>
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={on} max={today()} onChange={(e) => setOn(e.target.value)} required />
          </label>
        </div>
        <label className="block">
          <span className="label">
            {out ? "Reason" : "Note"} {!out && <span className="font-normal text-navy-400">optional</span>}
          </span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} required={out} placeholder={out ? "e.g. Moved back to the school bank account" : "e.g. November fees"} />
        </label>
        <button type="submit" className={clsx("w-full justify-center sm:w-auto", out ? "btn-ghost" : "btn-primary")} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : out ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}
          {out ? "Take money out" : "Add to wallet"}
        </button>
      </form>
      )}
    </div>
  );
}

/** Pays one teacher's owed amount from the wallet. */
export function PayFromWallet({
  teacherId,
  periodStart,
  amount,
  teacherName,
  disabledReason,
  destination,
}: {
  teacherId: string;
  periodStart: string;
  amount: string;
  teacherName: string;
  disabledReason?: string;
  /** Set when IntaSend is connected: where the money will actually go. */
  destination?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-primary px-3 py-1.5 text-xs"
      disabled={pending || !!disabledReason}
      title={disabledReason}
      onClick={() =>
        confirm(destination ? `Send ${amount} to ${teacherName} (${destination}) through IntaSend?` : `Pay ${amount} to ${teacherName} from the school wallet?`) &&
        start(async () => {
          const r = await payFromWallet({ teacherId, periodStart });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WalletCards className="h-3.5 w-3.5" />} Pay {amount} from wallet
    </button>
  );
}

/** Pays every teacher owed for the period in one go. */
export function PayAllFromWallet({ periodStart, total, count, enough, viaIntaSend }: { periodStart: string; total: string; count: number; enough: boolean; viaIntaSend?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-gold px-4 py-2.5 font-bold"
      disabled={pending || !enough}
      onClick={() =>
        confirm(`${viaIntaSend ? "Send" : "Pay"} ${total} to ${count} ${count === 1 ? "teacher" : "teachers"} ${viaIntaSend ? "through IntaSend, to the M-Pesa numbers and bank accounts on their profiles" : "from the school wallet"}?`) &&
        start(async () => {
          const r = await payAllFromWallet(periodStart);
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Pay all {count} {count === 1 ? "teacher" : "teachers"} · {total}
    </button>
  );
}

type Details = { method: string | null; phone: string | null; bank: string | null; bankCode: string | null; accountName: string | null; accountNumber: string | null };

/** Where a teacher's pay goes: M-Pesa number or bank account. Office only. */
export function TeacherPayoutDetails({ teacherId, details, banks }: { teacherId: string; details: Details; banks?: { name: string; code: string }[] | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [method, setMethod] = useState<"MPESA" | "BANK" | "">((details.method as "MPESA" | "BANK") ?? "");
  const [phone, setPhone] = useState(details.phone ?? "");
  const [bank, setBank] = useState(details.bank ?? "");
  const [bankCode, setBankCode] = useState(details.bankCode ?? "");
  const [accountName, setAccountName] = useState(details.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(details.accountNumber ?? "");
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy-800">
          {details.method === "MPESA" ? (
            <>
              M-Pesa <span className="font-mono">{details.phone}</span>
            </>
          ) : details.method === "BANK" ? (
            <>
              {details.bank} · {details.accountName} · <span className="font-mono">{details.accountNumber}</span>
            </>
          ) : (
            <span className="text-amber-700">Not set. Add where this teacher should be paid.</span>
          )}
        </p>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveTeacherPayoutDetails({ teacherId, method, phone, bank, bankCode: bankCode || undefined, accountName, accountNumber });
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setEditing(false);
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-px border border-line bg-line">
        {(
          [
            ["MPESA", "M-Pesa"],
            ["BANK", "Bank account"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={clsx("px-3 py-2 text-sm font-semibold", method === m ? "bg-navy-800 text-white" : "bg-white text-navy-700 hover:bg-ivory")}
          >
            {label}
          </button>
        ))}
      </div>
      {method === "MPESA" && (
        <label className="block">
          <span className="label">M-Pesa number</span>
          <input className="input font-mono" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
        </label>
      )}
      {method === "BANK" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Bank</span>
            {banks?.length ? (
              <select
                className="input"
                value={bankCode}
                onChange={(e) => {
                  setBankCode(e.target.value);
                  setBank(banks.find((b) => b.code === e.target.value)?.name ?? "");
                }}
              >
                <option value="">Choose a bank…</option>
                {banks.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. Equity Bank" />
            )}
          </label>
          <label className="block">
            <span className="label">Account name</span>
            <input className="input" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Account number</span>
            <input className="input font-mono" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </label>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending || !method}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </form>
  );
}
