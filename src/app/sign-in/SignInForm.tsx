"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, type SignInState } from "@/lib/actions/auth";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-2.5">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
    </button>
  );
}

export function SignInForm() {
  const [state, action] = useFormState<SignInState, FormData>(signIn, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">
          {state.error}
        </p>
      )}
      <div>
        <label className="label" htmlFor="identifier">
          Username, email or phone
        </label>
        <input
          id="identifier"
          name="identifier"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            className="input pr-10"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-navy-300 hover:text-navy-700"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Submit />
      <p className="text-center text-xs text-navy-400">Forgot your password? The Crest Learning office can reset it.</p>
    </form>
  );
}
