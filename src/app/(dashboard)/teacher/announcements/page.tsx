import { requireRole } from "@/lib/auth";
import { announcementsFor } from "@/lib/announcements";
import { PageHeader } from "@/components/ui/primitives";
import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { MarkAnnouncementsRead } from "@/components/announcements/Announcements";

export const metadata = { title: "Announcements" };

export default async function TeacherAnnouncementsPage() {
  const me = await requireRole("teacher");
  const items = await announcementsFor(me.id);
  return (
    <>
      <PageHeader eyebrow="Teacher portal" title="Announcements" description="Notices from the Crest Learning office." />
      <MarkAnnouncementsRead unread={items.filter((i) => !i.readAt).length} />
      <AnnouncementList items={items} />
    </>
  );
}
