import { requireRole } from "@/lib/auth";
import { StaffResourcesPage } from "@/components/work/StaffPages";

export const metadata = { title: "Documents & worksheets" };

export default async function Page({ searchParams }: { searchParams: { kind?: string } }) {
  const me = await requireRole("admin");
  return <StaffResourcesPage portal="admin" me={me} kind={searchParams.kind} />;
}
