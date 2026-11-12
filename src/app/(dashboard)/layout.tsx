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
import { BLOB_LIMITS, blobConfigured } from "@/lib/storage";
import { UploadModeProvider } from "@/components/work/UploadMode";

/** Pages a teacher may still open while lesson records are outstanding. */
const RECORDS_PATH = "/teacher/records";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole();
  const path = headers().get("x-pathname") ?? "";
  // People with more than one portal (a teacher with admin access) see the one they're in.
  const portals = portalsFor(user);
  const slug = portals.find((p) => path === `/${p}` || path.startsWith(`/${p}/`)) ?? portals[0];

  // Every sidebar count is fetched at the same time (one round trip of waiting, not five).
  const [pending, teacherCounts, studentWork, unread, due] = await Promise.all([
    slug === "teacher" ? pendingRecordCount(user.id) : 0,
    slug === "teacher" ? staffCounts("teacher", user.id) : null,
    slug === "student" ? workForStudent(user.id) : null,
    slug !== "admin" ? unreadAnnouncements(user.id) : 0,
    slug === "parent"
      ? prisma.invoice.count({ where: { status: { in: ["ISSUED", "PARTIALLY_PAID"] }, student: { guardians: { some: { parentId: user.id } } } } })
      : 0,
  ]);

  // Lesson records are mandatory: until they're done, teachers only see the records page.
  if (pending > 0 && !path.startsWith(RECORDS_PATH) && !path.startsWith("/teacher/sessions/")) redirect(RECORDS_PATH);

  const badges: Record<string, number> = {};
  if (pending) badges[RECORDS_PATH] = pending;
  if (teacherCounts && teacherCounts.toMark + teacherCounts.requests) badges["/teacher/resources"] = teacherCounts.toMark + teacherCounts.requests;
  const todo = studentWork?.filter((i) => i.state === "todo" || i.state === "overdue").length ?? 0;
  if (todo) badges["/student/work"] = todo;
  if (unread) badges[`/${slug}/announcements`] = unread;
  if (due) badges["/parent/invoices"] = due;

  return (
    <div className="flex min-h-screen">
      <Sidebar items={NAV[slug]} roleLabel={`${ROLE_LABEL[slug]} portal`} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} portal={slug} portals={portals} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <UploadModeProvider value={{ blob: blobConfigured(), userId: user.id, limits: blobConfigured() ? BLOB_LIMITS : null }}>{children}</UploadModeProvider>
        </main>
      </div>
    </div>
  );
}
