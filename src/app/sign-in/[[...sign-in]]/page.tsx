"use client";

import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import Image from "next/image";
import { Loader2, MapPin } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";

const CURRICULA = ["Cambridge", "Edexcel", "CBE", "IB"];

export default function SignInPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-navy-800 lg:flex lg:flex-col lg:items-center lg:justify-center">
        {/* the logo's ring, echoed large and faint */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full border-[18px] border-white/[0.035]" />
        <div className="pointer-events-none absolute -bottom-56 -left-32 h-[520px] w-[520px] rounded-full border border-gold-500/20" />

        <div className="relative flex flex-col items-center px-10 text-center">
          <Image
            src="/brand/crest-mark-light.png"
            alt=""
            width={240}
            height={177}
            priority
            className="h-auto w-[220px]"
          />
          <p className="mt-8 font-display text-[13px] font-semibold tracking-[0.42em] text-white">
            LEARN. GROW. EXCEL.
          </p>
          <div className="my-6 h-px w-72 bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
          <ul className="flex items-center font-display text-[11px] font-semibold tracking-[0.24em] text-navy-100">
            {CURRICULA.map((c, i) => (
              <li key={c} className="flex items-center">
                {i > 0 && <span className="mx-4 h-3.5 w-px bg-gold-500" aria-hidden />}
                {c.toUpperCase()}
              </li>
            ))}
          </ul>
          <p className="mt-8 flex items-center gap-2 font-display text-[11px] font-semibold tracking-[0.3em] text-navy-200">
            <MapPin className="h-4 w-4 text-gold-500" strokeWidth={2} />
            NAIROBI, KENYA
          </p>
        </div>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-ivory px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark />
          </div>

          <SignIn.Root routing="path" path="/sign-in" fallback={<FormSkeleton />}>
            <Clerk.Loading>
              {(isGlobalLoading) => (
                <SignIn.Step name="start" className="space-y-5">
                  <div>
                    <p className="eyebrow">Welcome back</p>
                    <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
                      Sign in to Crest
                    </h1>
                    <p className="mt-1.5 text-sm text-navy-500">
                      Parents, students and teachers use the details given by the Crest office.
                    </p>
                  </div>

                  <Clerk.GlobalError className="block rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-100" />

                  <Clerk.Field name="identifier" className="space-y-1.5">
                    <Clerk.Label className="label">Username or email</Clerk.Label>
                    <Clerk.Input
                      type="text"
                      autoComplete="username"
                      required
                      className="input data-[invalid]:border-rose-300 data-[invalid]:ring-rose-100"
                    />
                    <Clerk.FieldError className="block text-xs text-rose-600" />
                  </Clerk.Field>

                  <Clerk.Field name="password" className="space-y-1.5">
                    <Clerk.Label className="label">Password</Clerk.Label>
                    <Clerk.Input
                      type="password"
                      autoComplete="current-password"
                      required
                      className="input data-[invalid]:border-rose-300 data-[invalid]:ring-rose-100"
                    />
                    <Clerk.FieldError className="block text-xs text-rose-600" />
                  </Clerk.Field>

                  <SignIn.Action submit disabled={isGlobalLoading} className="btn-primary w-full py-2.5">
                    <Clerk.Loading>
                      {(loading) =>
                        loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"
                      }
                    </Clerk.Loading>
                  </SignIn.Action>

                  <p className="text-center text-xs text-navy-400">
                    Forgot your password? Ask the Crest office to reset it.
                  </p>
                </SignIn.Step>
              )}
            </Clerk.Loading>
          </SignIn.Root>

          <div className="mt-12 gold-rule" />
          <p className="mt-4 text-center font-display text-[10px] font-semibold tracking-[0.3em] text-navy-300">
            CREST LEARNING · NAIROBI
          </p>
        </div>
      </main>
    </div>
  );
}

/** Shown while Clerk loads, so the page is never blank. */
function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading sign-in">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">Sign in to Crest</h1>
        <p className="mt-1.5 text-sm text-navy-500">Parents, students and teachers use the details given by the Crest office.</p>
      </div>
      {["Username or email", "Password"].map((l) => (
        <div key={l} className="space-y-1.5">
          <p className="label">{l}</p>
          <div className="h-[38px] animate-pulse rounded-lg border border-line bg-white" />
        </div>
      ))}
      <div className="flex h-[42px] items-center justify-center rounded-lg bg-navy-800/90">
        <Loader2 className="h-4 w-4 animate-spin text-white" />
      </div>
    </div>
  );
}
