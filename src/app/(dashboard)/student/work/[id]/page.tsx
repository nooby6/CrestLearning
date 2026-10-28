import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { LearnerResourceDetail } from "@/components/work/LearnerPages";

export const metadata = { title: "Worksheet" };

export default async function Page({ params }: { params: { id: string } }) {
  const me = await requireRole("student");
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  return <LearnerResourceDetail me={me} viewer="student" id={id} studentId={me.id} />;
}
