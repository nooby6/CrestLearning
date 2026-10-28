"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { deletePerson } from "@/lib/actions/people";

/** Permanent deletion, behind a typed-name confirmation that spells out what goes with the account. */
export function DeleteAccount({ userId, name, impact }: { userId: string; name: string; impact: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim().replace(/\s+/g, " ").toLowerCase() === name.replace(/\s+/g, " ").toLowerCase();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-700 transition hover:bg-rose-50">
        <Trash2 className="h-4 w-4" /> Delete account…
      </button>
    );
  }
  return (
    <div className="fade-in space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-rose-800">
        <AlertTriangle className="h-4 w-4" /> Delete {name} permanently?
      </p>
      <ul className="list-disc space-y-1 pl-5 text-xs text-rose-900/80">
        {impact.map((line) => (
          <li key={line}>{line}</li>
        ))}
        <li>This can’t be undone. To keep their history, suspend the account instead.</li>
      </ul>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-rose-900">
          Type <b>{name}</b> to confirm
        </span>
        <input className="input border-rose-200 focus:border-rose-400 focus:ring-rose-100" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!matches || pending}
          onClick={() =>
            start(async () => {
              const r = await deletePerson(userId, typed);
              if (!r.ok) return void toast.error(r.error);
              toast.success(r.message);
              router.push("/admin/people");
            })
          }
          className="btn flex-1 bg-rose-600 text-white hover:bg-rose-700"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete permanently
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
