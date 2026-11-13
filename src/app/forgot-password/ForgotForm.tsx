"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Loader2, MailCheck } from "lucide-react";
import { requestPasswordReset, type ForgotState } from "@/lib/actions/password-reset";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
    </button>
  );
}

export function ForgotForm() {
  const [state, action] = useFormState<ForgotState, FormData>(requestPasswordReset, undefined);
  if (state?.sent)
    return (
      <div role="status" className="border border-line border-l-4 border-l-emerald-600 bg-white px-4 py-3 text-sm text-navy-700">
        <p className="flex items-center gap-2 font-semibold text-navy-900">
          <MailCheck className="h-4 w-4 text-emerald-700" /> Check your email
        </p>
        <p className="mt-1">
          If that account has an email address, a reset link is on its way. It expires in 30 minutes. No email arriving? Check spam, or ask the Crest office.
        </p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="identifier">
          Username or email
        </label>
        <input id="identifier" name="identifier" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus />
      </div>
      <Submit />
    </form>
  );
}
