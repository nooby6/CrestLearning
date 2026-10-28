import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { hasAdminAccess, homePath } from "@/lib/roles";
import { initials } from "@/lib/format";
import { Wordmark } from "@/components/brand/Logo";
import { PhotoForm } from "./PhotoForm";

export const metadata = { title: "Profile photo" };

export default async function PhotoPage() {
  const me = await getCurrentUser();
  if (!me || !me.active) redirect("/sign-in");
  if (me.role !== "TEACHER" && !hasAdminAccess(me)) redirect(homePath(me));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Wordmark className="mb-10" />
      <div className="card w-full max-w-sm overflow-hidden">
        <div className="crest-navy h-20" />
        <div className="-mt-16 px-7 pb-7">
          <PhotoForm current={me.avatarUrl} initials={initials(me)} />
        </div>
        <div className="border-t border-line px-7 py-3">
          <Link href={homePath(me)} className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>
    </div>
  );
}
