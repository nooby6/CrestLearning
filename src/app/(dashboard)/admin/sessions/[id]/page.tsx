import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SessionDetail } from "@/components/class/SessionDetail";

export const metadata = { title: "Session" };

export default async function AdminSessionPage({ params }: { params: { id: string } }) {
  const me = await requireRole("admin");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  return <SessionDetail id={id} me={me} backHref="/admin/schedule" backLabel="Schedule" />;
}
