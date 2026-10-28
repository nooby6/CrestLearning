import { requireRole } from "@/lib/auth";
import { StudentWorkPage } from "@/components/work/LearnerPages";

export const metadata = { title: "Worksheets & files" };

export default async function Page() {
  const me = await requireRole("student");
  return <StudentWorkPage me={me} />;
}
