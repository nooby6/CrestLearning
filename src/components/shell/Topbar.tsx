import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { devImpersonation, type CurrentUser } from "@/lib/auth";
import { ROLE_LABEL, toSlug } from "@/lib/roles";
import { AccountMenu } from "./AccountMenu";

export function Topbar({ user }: { user: CurrentUser }) {
  const dev = devImpersonation();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/85 backdrop-blur print:hidden">
      <div className="flex h-16 items-center justify-end gap-4 px-4 pl-16 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto lg:hidden" aria-label="Crest Learning home">
          <Wordmark />
        </Link>
        {dev && (
          <span className="hidden rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200 sm:inline lg:mr-auto">
            Preview · signed in as {user.username}
          </span>
        )}
        <AccountMenu
          user={{ id: user.id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }}
          roleLabel={ROLE_LABEL[toSlug(user.role)]}
        />
      </div>
    </header>
  );
}
