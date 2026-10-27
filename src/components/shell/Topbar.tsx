import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Wordmark } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/primitives";
import { devImpersonation, type CurrentUser } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { ROLE_LABEL, toSlug } from "@/lib/roles";

export function Topbar({ user }: { user: CurrentUser }) {
  const dev = devImpersonation();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center justify-end gap-4 px-4 pl-16 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto lg:hidden" aria-label="Crest Learning home">
          <Wordmark />
        </Link>
        {dev && (
          <span className="hidden rounded-md lg:mr-auto bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 sm:inline">
            Dev preview · signed in as {user.username}
          </span>
        )}
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-navy-900">{fullName(user)}</p>
          <p className="text-[11px] text-navy-400">{ROLE_LABEL[toSlug(user.role)]}</p>
        </div>
        {dev ? (
          <Avatar person={user} />
        ) : (
          <UserButton
            appearance={{
              elements: { avatarBox: "h-9 w-9 ring-2 ring-gold-200" },
              variables: { colorPrimary: "#0A1D4F" },
            }}
          />
        )}
      </div>
    </header>
  );
}
