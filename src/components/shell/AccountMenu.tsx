"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeftRight, Camera, ChevronDown, KeyRound, Loader2, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import { signOut } from "@/lib/actions/auth";

/**
 * Account menu with a guarded sign-out: teachers with outstanding lesson
 * records are stopped and sent to complete them.
 */
export function AccountMenu({
  user,
  roleLabel,
  switchTo = [],
  canEditPhoto = false,
}: {
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
  roleLabel: string;
  switchTo?: { href: string; label: string }[];
  canEditPhoto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const handleSignOut = () =>
    start(async () => {
      const r = await signOut();
      if (r && !r.ok) setBlocked(r.pending);
    });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setBlocked(null);
        }}
        className="flex items-center gap-3 py-1 pl-3 pr-1 transition hover:bg-navy-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="hidden text-right leading-tight sm:block">
          <span className="block text-sm font-medium text-navy-900">
            {user.firstName} {user.lastName}
          </span>
          <span className="block text-[11px] text-navy-400">{roleLabel}</span>
        </span>
        <Avatar person={user} />
        <ChevronDown className="hidden h-4 w-4 text-navy-300 sm:block" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-72 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          {blocked ? (
            <div className="p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Lesson records outstanding
              </p>
              <p className="mt-1.5 text-xs text-navy-500">
                Please record what you covered in {blocked} {blocked === 1 ? "lesson" : "lessons"} before signing out.
              </p>
              <a href="/teacher/records" className="btn-primary mt-3 w-full">
                Complete lesson records
              </a>
            </div>
          ) : (
            <div className="py-1.5">
              {/* A full page load, so the sidebar and header rebuild for the other portal. */}
              {switchTo.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  role="menuitem"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-navy-900 hover:bg-gold-50"
                >
                  <ArrowLeftRight className="h-4 w-4 text-gold-600" /> Switch to {s.label}
                </a>
              ))}
              {switchTo.length > 0 && <div className="my-1.5 border-t border-line" />}
              {canEditPhoto && (
                <Link
                  href="/account/photo"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-navy-800 hover:bg-navy-50"
                >
                  <Camera className="h-4 w-4 text-navy-400" /> Profile photo
                </Link>
              )}
              <Link
                href="/account/password"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-navy-800 hover:bg-navy-50"
              >
                <KeyRound className="h-4 w-4 text-navy-400" /> Change password
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                disabled={pending}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-navy-800 hover:bg-navy-50"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin text-navy-400" /> : <LogOut className="h-4 w-4 text-navy-400" />}
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
