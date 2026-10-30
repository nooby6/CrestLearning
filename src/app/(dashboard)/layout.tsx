import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { NAV } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { pendingRecordCount } from "@/lib/attendance";
import { staffCounts, workForStudent } from "@/lib/work-queries";
import { ROLE_LABEL, portalsFor } from "@/lib/roles";
import { unreadAnnouncements } from "@/lib/announcements";
import prisma from "@/lib/prisma";

/** Pages a teacher may still open while lesson records are outstanding. */
const RECORDS_PATH = "/teacher/records";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  const path = headers().get("x-pathname") ?? "";
  // People with more than one portal (a teacher with admin access) see the one they're in.
  const portals = portalsFor(user);
  const slug = portals.find((p) => path === `/${p}` || path.startsWith(`/${p}/`)) ?? portals[0];

  // Lesson records are mandatory: until they're done, teachers only see the records page.
  let pending = 0;
  if (slug === "teacher") {
    pending = await pendingRecordCount(user.id);
    if (pending > 0 && !path.startsWith(RECORDS_PATH) && !path.startsWith("/teacher/sessions/")) redirect(RECORDS_PATH);
  }

  // Sidebar counters: lesson records (teachers), work to mark + requests (teachers), worksheets to do (students).
  const badges: Record<string, number> = {};
  if (pending) badges[RECORDS_PATH] = pending;
  if (slug === "teacher") {
    const c = await staffCounts("teacher", user.id);
    if (c.toMark + c.requests) badges["/teacher/resources"] = c.toMark + c.requests;
  }
  if (slug === "student") {
    const todo = (await workForStudent(user.id)).filter((i) => i.state === "todo" || i.state === "overdue").length;
    if (todo) badges["/student/work"] = todo;
  }

  if (slug !== "admin") {
    const unread = await unreadAnnouncements(user.id);
    if (unread) badges[`/${slug}/announcements`] = unread;
  }
  if (slug === "parent") {
    const due = await prisma.invoice.count({
      where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, student: { guardians: { some: { parentId: user.id } } } },
    });
    if (due) badges["/parent/invoices"] = due;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV[slug]} roleLabel={`${ROLE_LABEL[slug]} portal`} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} portal={slug} portals={portals} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
