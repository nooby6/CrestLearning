import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";
import { Wordmark } from "@/components/brand/Logo";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Password" };

/** Outside the dashboard layout so first-time users can reach it before anything else. */
export default async function PasswordPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/sign-in");
  const first = me.mustChangePassword;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ivory px-6 py-12">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-sm p-7">
        {!first && (
          <Link href={homePath(me)} className="mb-4 inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        )}
        <p className="eyebrow">{first ? `Welcome, ${me.firstName}` : "Account"}</p>
        <h1 className="mt-1.5 font-display text-xl font-semibold text-navy-900">{first ? "Choose your password" : "Change password"}</h1>
        <p className="mb-5 mt-1 text-sm text-navy-500">
          {first ? "You signed in with a temporary password. Choose your own to continue." : `Signed in as @${me.username}.`}
        </p>
        <PasswordForm first={first} />
      </div>
    </div>
  );
}
