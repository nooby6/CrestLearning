"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
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

export function SignInForm({ google = false }: { google?: boolean }) {
  const [state, action] = useFormState<SignInState, FormData>(signIn, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <p role="alert" className="border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
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
      {google && (
        <>
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-navy-300">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          {/* A plain link: the browser goes to Google and comes back signed in. */}
          <a href="/api/auth/google" className="btn-ghost w-full py-2.5">
            Continue with Google
          </a>
        </>
      )}
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-medium text-navy-600 underline-offset-4 hover:text-navy-900 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
