"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { SITE_NAV } from "./site-nav";


export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="site-wrap flex h-[72px] items-center gap-6">
        <Link href="/" aria-label="Crest Learning — home" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {SITE_NAV.map((n) => {
              const active = path === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "relative block px-3 py-2 text-[15px] font-medium transition-colors",
                      active ? "text-navy-900" : "text-navy-600 hover:text-navy-900",
                      "after:absolute after:inset-x-3 after:-bottom-[17px] after:h-[3px] after:bg-gold-500 after:transition-opacity",
                      active ? "after:opacity-100" : "after:opacity-0",
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Link href="/portal" className="btn-ghost hidden sm:inline-flex">
            Portal sign-in
          </Link>
          <Link href="/admissions#enquire" className="btn-gold hidden sm:inline-flex">
            Enquire
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center border border-line text-navy-800 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="site-menu" className="fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto border-t border-line bg-white lg:hidden">
          <nav aria-label="Main" className="site-wrap py-4">
            <ul className="divide-y divide-line border-y border-line">
              {SITE_NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={clsx("flex items-center justify-between py-4 font-display text-lg font-semibold", path === n.href ? "text-navy-900" : "text-navy-700")}
                  >
                    {n.label}
                    {path === n.href && <span className="h-2.5 w-2.5 bg-gold-500" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              <Link href="/admissions#enquire" className="btn-gold py-3">
                Enquire about a place
              </Link>
              <Link href="/portal" className="btn-ghost py-3">
                Portal sign-in
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
