"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, LogOut } from "lucide-react";
import { adminEndAllSessions } from "@/lib/actions/sessions-control";

export function EndSessionsButton({ userId, name, count }: { userId: string; name: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost w-full"
      disabled={pending || count === 0}
      onClick={() =>
        confirm(`Sign ${name} out on every device? They’ll need to sign in again.`) &&
        start(async () => {
          const r = await adminEndAllSessions(userId);
          r.ok ? toast.success(r.message) : toast.error(r.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out everywhere
    </button>
  );
}
