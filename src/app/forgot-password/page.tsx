import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { emailConfigured } from "@/lib/env";
import { Wordmark } from "@/components/brand/Logo";
import { ForgotForm } from "./ForgotForm";

// Per-user page: always rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 py-12">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-sm p-7">
        <Link href="/sign-in" className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
          <ArrowLeft className="h-4 w-4" /> Sign in
        </Link>
        <p className="eyebrow">Account</p>
        <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">Forgot your password?</h1>
        {emailConfigured() ? (
          <>
            <p className="mb-5 mt-1 text-sm text-navy-500">Enter your username or email. If your account has an email address, we’ll send you a link to choose a new password.</p>
            <ForgotForm />
          </>
        ) : (
          <p className="mt-2 text-sm text-navy-600">The Crest Learning office can reset it for you. They’ll give you a temporary password to sign in with.</p>
        )}
      </div>
    </div>
  );
}
