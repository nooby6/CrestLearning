"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Loader2, LogOut } from "lucide-react";
import { endMyOtherSessions, endMySession } from "@/lib/actions/sessions-control";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message);
      else toast.error(r.error);
      router.refresh();
    });
  return { pending, run };
}

export function EndSession({ id }: { id: string }) {
  const { pending, run } = useRun();
  return (
    <button type="button" className="btn-ghost" disabled={pending} onClick={() => run(() => endMySession(id))}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out
    </button>
  );
}

export function EndOthers() {
  const { pending, run } = useRun();
  return (
    <button type="button" className="btn-danger" disabled={pending} onClick={() => confirm("Sign out every other device?") && run(() => endMyOtherSessions())}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Sign out all other devices
    </button>
  );
}
