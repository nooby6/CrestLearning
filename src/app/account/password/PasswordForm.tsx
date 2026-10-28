"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { changePassword, type ChangePasswordState } from "@/lib/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </button>
  );
}

export function PasswordForm({ first }: { first: boolean }) {
  const [state, action] = useFormState<ChangePasswordState, FormData>(changePassword, undefined);
  const err = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-800 ring-1 ring-emerald-100">
        <CheckCircle2 className="h-4 w-4" /> Password changed. Other devices have been signed out.
      </p>
    );
  }

  const field = (name: string, label: string, auto: string) => (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} type="password" className="input" autoComplete={auto} required />
      {err[name] && <p className="mt-1 text-xs text-rose-600">{err[name]}</p>}
    </div>
  );

  return (
    <form action={action} className="space-y-4">
      {!first && field("current", "Current password", "current-password")}
      {field("next", "New password", "new-password")}
      {field("confirm", "Confirm new password", "new-password")}
      <p className="text-xs text-navy-400">At least 8 characters. A short phrase is easier to remember and harder to guess.</p>
      <Submit label={first ? "Set my password" : "Change password"} />
    </form>
  );
}
