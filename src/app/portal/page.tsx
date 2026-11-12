import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";

// Per-user page: always rendered on request.
export const dynamic = "force-dynamic";

/** Entry point after sign-in: send everyone to their own portal. */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.active) redirect("/pending?reason=inactive");
  redirect(homePath(user));
}
