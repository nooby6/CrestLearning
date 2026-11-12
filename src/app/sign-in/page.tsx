import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";
import { Wordmark } from "@/components/brand/Logo";
import { ensureBootstrapAdmin } from "@/lib/bootstrap";
import { SignInForm } from "./SignInForm";
import { googleConfigured } from "@/lib/env";

// Per-user page: always rendered on request.
export const dynamic = "force-dynamic";

const GOOGLE_MSG: Record<string, string> = {
  nomatch: "That Google account’s email isn’t on a Crest account. Sign in with your username, or ask the office to add this email to your account.",
  suspended: "This account is suspended. Please contact the Crest Learning office.",
  failed: "Google sign-in didn’t complete. Please try again.",
  cancelled: "Google sign-in was cancelled.",
  off: "Google sign-in isn’t switched on.",
};

export const metadata = { title: "Sign in" };

const CURRICULA = ["Cambridge", "Edexcel", "CBE", "IB"];

export default async function SignInPage({ searchParams }: { searchParams: { timeout?: string; reset?: string; google?: string } }) {
  await ensureBootstrapAdmin();
  const me = await getCurrentUser();
  if (me?.active) redirect(homePath(me));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-navy-800 lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full border-[18px] border-white/[0.035]" />
        <div className="pointer-events-none absolute -bottom-56 -left-32 h-[520px] w-[520px] rounded-full border border-gold-500/20" />
        <div className="relative flex flex-col items-center px-10 text-center">
          <Image src="/brand/crest-mark-light.png" alt="" width={240} height={177} priority className="h-auto w-[220px]" />
          <p className="mt-8 font-display text-[13px] font-semibold tracking-[0.42em] text-white">LEARN. GROW. EXCEL.</p>
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
        <div className="w-full max-w-sm border border-line bg-white p-8">
          <div className="mb-8 lg:hidden">
            <Wordmark />
          </div>
          <div className="mb-6">
            <p className="eyebrow">Welcome back</p>
            <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">Sign in to Crest</h1>
            <p className="mt-1.5 text-sm text-navy-500">Parents, students and teachers use the details given by the Crest Learning office.</p>
          </div>
          {searchParams.reset && (
            <p role="status" className="mb-5 border border-line border-l-4 border-l-emerald-600 bg-ivory px-3 py-2.5 text-sm text-navy-700">
              Your password has been changed. Sign in with your new password.
            </p>
          )}
          {searchParams.google && GOOGLE_MSG[searchParams.google] && (
            <p role="alert" className="mb-5 border border-line border-l-4 border-l-rose-600 bg-ivory px-3 py-2.5 text-sm text-navy-700">
              {GOOGLE_MSG[searchParams.google]}
            </p>
          )}
          {searchParams.timeout && (
            <p role="status" className="mb-5 border border-line border-l-4 border-l-gold-500 bg-ivory px-3 py-2.5 text-sm text-navy-700">
              You were signed out because your 3-hour session ended. Please sign in again.
            </p>
          )}
          <SignInForm google={googleConfigured()} />
          <p className="mt-6 text-center text-sm">
            <Link href="/" className="text-navy-500 underline-offset-4 hover:text-navy-900 hover:underline">
              Back to the website
            </Link>
          </p>
          <div className="mt-10 gold-rule" />
          <p className="mt-4 text-center font-display text-[10px] font-semibold tracking-[0.3em] text-navy-300">CREST LEARNING · NAIROBI</p>
        </div>
      </main>
    </div>
  );
}
