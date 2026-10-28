import { requireRole } from "@/lib/auth";
import { StaffNewResourcePage } from "@/components/work/StaffPages";

export const metadata = { title: "Share a document or worksheet" };

export default async function Page({ searchParams }: { searchParams: { enrollment?: string; request?: string } }) {
  const me = await requireRole("teacher");
  return <StaffNewResourcePage portal="teacher" me={me} enrollment={searchParams.enrollment} request={searchParams.request} />;
}
