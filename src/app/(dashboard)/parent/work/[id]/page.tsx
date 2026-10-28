import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { LearnerResourceDetail } from "@/components/work/LearnerPages";

export const metadata = { title: "Schoolwork" };

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { student?: string } }) {
  const me = await requireRole("parent");
  const id = Number(params.id);
  if (!Number.isInteger(id) || !searchParams.student) notFound();
  return <LearnerResourceDetail me={me} viewer="parent" id={id} studentId={searchParams.student} />;
}
