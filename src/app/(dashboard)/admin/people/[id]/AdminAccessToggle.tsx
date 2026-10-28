"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "react-toastify";
import { Loader2, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { setAdminAccess } from "@/lib/actions/people";

/** Switch for giving a teacher administrator access alongside their teaching. */
export function AdminAccessToggle({ userId, firstName, on }: { userId: string; firstName: string; on: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      const r = await setAdminAccess(userId, !on);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.error);
    });

  return (
    <div className="flex items-start gap-4">
      <span
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
          on ? "bg-navy-800 text-gold-400" : "bg-navy-50 text-navy-300",
        )}
      >
        <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy-900">{on ? "Administrator access on" : "Teacher access only"}</p>
        <p className="mt-0.5 text-xs text-navy-500">
          {on
            ? `${firstName} can run the admin portal and switch to the teacher portal for their own students.`
            : `Turn on to let ${firstName} manage people, schedules, reports and finance as well as teach.`}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Administrator access"
        disabled={pending}
        onClick={toggle}
        className={clsx(
          "relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2",
          on ? "bg-navy-800" : "bg-navy-100",
        )}
      >
        <span
          className={clsx(
            "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform duration-200",
            on ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin text-navy-400" />}
        </span>
      </button>
    </div>
  );
}
