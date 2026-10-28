import Link from "next/link";
import { Wordmark } from "@/components/brand/Logo";
import { devImpersonation, type CurrentUser } from "@/lib/auth";
import { ROLE_LABEL, type RoleSlug } from "@/lib/roles";
import { AccountMenu } from "./AccountMenu";

export function Topbar({ user, portal, portals }: { user: CurrentUser; portal: RoleSlug; portals: RoleSlug[] }) {
  const dev = devImpersonation();
  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md print:hidden">
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
          roleLabel={portals.length > 1 ? `${ROLE_LABEL[portal]} · ${portals.map((p) => ROLE_LABEL[p]).filter((l) => l !== ROLE_LABEL[portal]).join(", ")}` : ROLE_LABEL[portal]}
          switchTo={portals.filter((p) => p !== portal).map((p) => ({ href: `/${p}`, label: `${ROLE_LABEL[p]} portal` }))}
        />
      </div>
      <div aria-hidden className="h-px bg-gradient-to-r from-line via-gold-300/70 to-line" />
    </header>
  );
}
