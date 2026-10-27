"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createFirstAdmin } from "@/lib/actions/setup";

export function SetupForm() {
  const [f, setF] = useState({ token: "", firstName: "", lastName: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-3 font-display text-lg font-semibold text-navy-900">Administrator created</h2>
        <p className="mt-1 text-sm text-navy-500">
          Sign in as <span className="font-mono">{f.username}</span> or <span className="font-mono">{f.email}</span>.
        </p>
        <Link href="/sign-in" className="btn-primary mt-5">
          Go to sign in
        </Link>
      </div>
    );
  }

  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>
        {label}
      </label>
      <input
        id={k}
        className="input"
        value={f[k]}
        onChange={(e) => {
          setF({ ...f, [k]: e.target.value });
          setErrors({ ...errors, [k]: "" });
        }}
        {...props}
      />
      {errors[k] && <p className="mt-1 text-xs text-rose-600">{errors[k]}</p>}
    </div>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createFirstAdmin(f);
          if (r.ok) setDone(true);
          else {
            setError(r.error);
            setErrors(r.fieldErrors ?? {});
          }
        });
      }}
    >
      {field("token", "Setup token", { type: "password", autoComplete: "off", placeholder: "The value of ADMIN_SETUP_TOKEN" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("firstName", "First name", { autoComplete: "given-name" })}
        {field("lastName", "Last name", { autoComplete: "family-name" })}
      </div>
      {field("email", "Email", { type: "email", autoComplete: "email" })}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("username", "Username", { autoCapitalize: "none", autoComplete: "username" })}
        {field("password", "Password", { type: "password", autoComplete: "new-password" })}
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100">{error}</p>}
      <button type="submit" className="btn-primary w-full py-2.5" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create administrator"}
      </button>
    </form>
  );
}
