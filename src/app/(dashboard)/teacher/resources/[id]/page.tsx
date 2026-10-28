import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { StaffResourceDetail } from "@/components/work/StaffPages";

export const metadata = { title: "Document or worksheet" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { student?: string } }) {
  const me = await requireRole("teacher");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  return <StaffResourceDetail portal="teacher" me={me} id={id} student={searchParams.student} />;
}
