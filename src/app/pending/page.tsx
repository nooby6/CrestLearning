import { SignOutButton } from "@clerk/nextjs";
import { Clock3, ShieldOff } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";

export const metadata = { title: "Account pending" };

export default function PendingPage({ searchParams }: { searchParams: { reason?: string } }) {
  const inactive = searchParams.reason === "inactive";
  const Icon = inactive ? ShieldOff : Clock3;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-lg font-semibold text-navy-900">
          {inactive ? "This account is suspended" : "Your account is being set up"}
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          {inactive
            ? "Access to this account has been suspended by the Crest Learning office. Please contact the office if you believe this is an error."
            : "You are signed in, but the Crest Learning office has not yet completed your account set-up. Please try again shortly or contact the office."}
        </p>
        <SignOutButton redirectUrl="/sign-in">
          <button className="btn-ghost mt-6">Sign out</button>
        </SignOutButton>
      </div>
    </div>
  );
}
