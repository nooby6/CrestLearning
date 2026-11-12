import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { ResetForm } from "./ResetForm";

// Per-user page: always rendered on request.
export const dynamic = "force-dynamic";

export const metadata = { title: "Choose a new password" };

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? "";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 py-12">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-sm p-7">
        <p className="eyebrow">Account</p>
        <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">Choose a new password</h1>
        {token ? (
          <>
            <p className="mb-5 mt-1 text-sm text-navy-500">At least 8 characters. You’ll be signed out everywhere and can then sign in with it.</p>
            <ResetForm token={token} />
          </>
        ) : (
          <p className="mt-2 text-sm text-navy-600">
            This link is incomplete. <Link href="/forgot-password" className="font-medium text-navy-900 underline underline-offset-4">Ask for a new one</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
