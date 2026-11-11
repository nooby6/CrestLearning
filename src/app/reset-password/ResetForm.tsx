"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { resetPassword, type ResetState } from "@/lib/actions/password-reset";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save new password"}
    </button>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useFormState<ResetState, FormData>(resetPassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}{" "}
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            New link
          </Link>
        </p>
      )}
      <div>
        <label className="label" htmlFor="next">
          New password
        </label>
        <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={8} required autoFocus />
        {fe.next && <p className="mt-1 text-xs text-rose-700">{fe.next}</p>}
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Type it again
        </label>
        <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
        {fe.confirm && <p className="mt-1 text-xs text-rose-700">{fe.confirm}</p>}
      </div>
      <Submit />
    </form>
  );
}
