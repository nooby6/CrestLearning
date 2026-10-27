import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { NAV } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { ROLE_LABEL, toSlug } from "@/lib/roles";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  const slug = toSlug(user.role);

  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV[slug]} roleLabel={`${ROLE_LABEL[slug]} portal`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
