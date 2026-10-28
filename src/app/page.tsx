import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePath } from "@/lib/roles";

/** Entry point after sign-in: send everyone to their own portal. */
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/pending");
  if (!user.active) redirect("/pending?reason=inactive");
  redirect(homePath(user));
}
