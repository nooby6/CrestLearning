import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { SessionDetail } from "@/components/class/SessionDetail";

export const metadata = { title: "Session" };

export default async function TeacherSessionPage({ params, searchParams }: { params: { id: string }; searchParams: { from?: string } }) {
  const me = await requireRole("teacher");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const fromRecords = searchParams.from === "records";
  return (
    <SessionDetail
      id={id}
      me={me}
      backHref={fromRecords ? "/teacher/records" : "/teacher"}
      backLabel={fromRecords ? "Lesson records" : "Today"}
      portal="teacher"
    />
  );
}
