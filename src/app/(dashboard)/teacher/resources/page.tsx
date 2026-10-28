import { requireRole } from "@/lib/auth";
import { StaffResourcesPage } from "@/components/work/StaffPages";

export const metadata = { title: "Documents & worksheets" };

export default async function Page({ searchParams }: { searchParams: { kind?: string } }) {
  const me = await requireRole("teacher");
  return <StaffResourcesPage portal="teacher" me={me} kind={searchParams.kind} />;
}
