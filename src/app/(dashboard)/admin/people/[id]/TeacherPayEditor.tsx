"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, Pencil } from "lucide-react";
import { setTeacherPay } from "@/lib/actions/people";

/** Hourly rate and weekly capacity — visible and editable by the office only. */
export function TeacherPayEditor({ teacherId, rateKes, capacity }: { teacherId: string; rateKes: number; capacity: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState(String(rateKes || ""));
  const [cap, setCap] = useState(String(capacity));
  const [pending, start] = useTransition();

  if (!editing) {
    return (
      <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit pay & hours
      </button>
    );
  }
  return (
    <form
      className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await setTeacherPay(teacherId, Number(rate || 0), Number(cap || 0));
          if (!r.ok) return void toast.error(r.error);
          toast.success(r.message);
          setEditing(false);
          router.refresh();
        });
      }}
    >
      <label className="block">
        <span className="label">Hourly rate (KES)</span>
        <input className="input tabular-nums" inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 1500" />
      </label>
      <label className="block">
        <span className="label">Weekly capacity (hours)</span>
        <input className="input tabular-nums" inputMode="numeric" value={cap} onChange={(e) => setCap(e.target.value.replace(/[^\d]/g, ""))} />
      </label>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </form>
  );
}
