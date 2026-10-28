import { ShieldOff } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { signOut } from "@/lib/actions/auth";

export const metadata = { title: "Account suspended" };

export default function PendingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-gold-600">
          <ShieldOff className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="font-display text-lg font-semibold text-navy-900">This account is suspended</h1>
        <p className="mt-2 text-sm text-navy-500">
          Access to this account has been suspended by the Crest Learning office. Please contact the office if you believe this is an error.
        </p>
        <form action={async () => { "use server"; await signOut(); }}>
          <button className="btn-ghost mt-6">Sign out</button>
        </form>
      </div>
    </div>
  );
}
