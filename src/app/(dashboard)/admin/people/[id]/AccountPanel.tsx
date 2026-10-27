"use client";

import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { Check, Copy, KeyRound, Loader2, PauseCircle, PlayCircle, RefreshCw } from "lucide-react";
import { resetPassword, setActive } from "@/lib/actions/people";
import { generatePassword } from "@/lib/password";

export function AccountPanel({
  userId,
  active,
  isSelf,
  hasLogin,
}: {
  userId: string;
  active: boolean;
  isSelf: boolean;
  hasLogin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [resetting, setResetting] = useState(false);
  const [pw, setPw] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-3">
      {hasLogin &&
        (shown ? (
          <div className="rounded-lg border border-gold-200 bg-gold-50/50 p-3">
            <p className="text-xs text-navy-500">New password — shown once</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <code className="text-sm text-navy-900">{shown}</code>
              <button
                type="button"
                className="rounded p-1 text-navy-400 hover:bg-white hover:text-navy-700"
                onClick={async () => {
                  await navigator.clipboard.writeText(shown);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                aria-label="Copy password"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : resetting ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input className="input font-mono text-[13px]" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="btn-ghost px-3" onClick={() => setPw(generatePassword())} aria-label="Generate">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                disabled={pending || pw.length < 8}
                onClick={() =>
                  startTransition(async () => {
                    const res = await resetPassword(userId, pw);
                    if (res.ok) {
                      setShown(pw);
                      setResetting(false);
                      toast.success(res.message);
                    } else toast.error(res.error);
                  })
                }
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save password"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setResetting(false)}>
                Cancel
              </button>
            </div>
            <p className="text-[11px] text-navy-400">They&apos;ll be signed out of other devices.</p>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setPw(generatePassword());
              setResetting(true);
            }}
          >
            <KeyRound className="h-4 w-4" /> Reset password
          </button>
        ))}

      {!isSelf && (
        <button
          type="button"
          disabled={pending}
          className={active ? "btn-danger w-full" : "btn-ghost w-full"}
          onClick={() => {
            if (active && !confirm("Suspend this account? The person is signed out and cannot sign in until the account is reactivated."))
              return;
            startTransition(async () => {
              const res = await setActive(userId, !active);
              if (res.ok) toast.success(res.message);
              else toast.error(res.error);
            });
          }}
        >
          {active ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
          {active ? "Suspend access" : "Reactivate"}
        </button>
      )}
    </div>
  );
}
