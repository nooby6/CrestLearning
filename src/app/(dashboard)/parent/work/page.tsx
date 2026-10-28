import { requireRole } from "@/lib/auth";
import { ParentWorkPage } from "@/components/work/LearnerPages";

export const metadata = { title: "Schoolwork" };

export default async function Page() {
  const me = await requireRole("parent");
  return <ParentWorkPage me={me} />;
}
