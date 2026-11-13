"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown, LogIn, Menu, Phone, X } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { SITE_NAV } from "./site-nav";

export function SiteHeader({ phone }: { phone?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar, as on most school sites: admissions note on the left, portal logins on the right. */}
      <div className="hidden bg-navy-950 text-[13px] text-navy-100 md:block">
        <div className="site-wrap flex h-10 items-center justify-between gap-6">
          <p className="flex items-center gap-2">
            <span className="h-2 w-2 bg-gold-500" aria-hidden />
            Admissions are open all year round.{" "}
            <Link href="/admissions#enquire" className="font-semibold text-gold-400 hover:text-gold-300 hover:underline">
              Enquire now
            </Link>
          </p>
          <div className="flex items-center gap-5">
            {phone && (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
                <Phone className="h-3.5 w-3.5 text-gold-400" /> {phone}
              </a>
            )}
            <Link href="/portal" className="flex items-center gap-1.5 hover:text-white">
              <LogIn className="h-3.5 w-3.5 text-gold-400" /> Parent portal login
            </Link>
            <Link href="/portal" className="hover:text-white">
              Student login
            </Link>
            <Link href="/portal" className="hover:text-white">
              Teacher login
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-line bg-white shadow-[0_8px_24px_-18px_rgba(10,29,79,0.35)]">
        <div className="site-wrap flex h-[76px] items-center gap-6">
          <Link href="/" aria-label="Crest Learning & STEM Centre — home" className="shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="Main" className="ml-auto hidden xl:block">
            <ul className="flex items-center">
              {SITE_NAV.map((g) => {
                const active = path === g.href || (g.href !== "/" && path.startsWith(g.href));
                return (
                  <li key={g.label} className="group relative">
                    <Link
                      href={g.href}
                      className={clsx(
                        "flex h-[76px] items-center gap-1 px-3.5 text-[15px] font-semibold transition-colors",
                        active ? "text-navy-900" : "text-navy-700 hover:text-navy-900",
                      )}
                    >
                      {g.label}
                      {g.items && <ChevronDown className="h-4 w-4 text-navy-400 transition-transform group-hover:rotate-180" />}
                      <span className={clsx("absolute inset-x-3.5 bottom-0 h-[3px] bg-gold-500 transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-60")} />
                    </Link>
                    {g.items && (
                      <div className="invisible absolute left-0 top-full w-72 translate-y-1 border border-line border-t-[3px] border-t-gold-500 bg-white opacity-0 shadow-[0_24px_48px_-20px_rgba(10,29,79,0.45)] transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                        <ul className="py-2">
                          {g.items.map((it) => (
                            <li key={it.href + it.label}>
                              <Link href={it.href} className="flex items-baseline justify-between gap-3 px-5 py-2.5 text-[15px] text-navy-800 hover:bg-ivory hover:text-navy-950">
                                {it.label}
                                {it.note && <span className="text-xs text-navy-400">{it.note}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-3">
            <Link href="/portal" className="btn-ghost hidden sm:inline-flex md:hidden xl:hidden">
              Portal login
            </Link>
            <Link href="/admissions#enquire" className="btn-gold hidden px-5 py-2.5 font-semibold sm:inline-flex">
              Enquire now
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="site-menu"
              onClick={() => setOpen((v) => !v)}
              className="grid h-11 w-11 place-items-center bg-navy-800 text-white xl:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div id="site-menu" className="fixed inset-x-0 bottom-0 top-[76px] z-40 overflow-y-auto bg-white md:top-[116px] xl:hidden">
          <nav aria-label="Main" className="site-wrap py-4">
            <ul className="divide-y divide-line border-b border-line">
              {SITE_NAV.map((g) => (
                <li key={g.label}>
                  <div className="flex items-center justify-between">
                    <Link href={g.href} className="flex-1 py-4 font-display text-lg font-bold text-navy-900">
                      {g.label}
                    </Link>
                    {g.items && (
                      <button
                        type="button"
                        aria-label={`Show ${g.label} pages`}
                        aria-expanded={expanded === g.label}
                        onClick={() => setExpanded(expanded === g.label ? null : g.label)}
                        className="grid h-11 w-11 place-items-center text-navy-600"
                      >
                        <ChevronDown className={clsx("h-5 w-5 transition-transform", expanded === g.label && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  {g.items && expanded === g.label && (
                    <ul className="mb-3 border-l-[3px] border-gold-500 bg-ivory">
                      {g.items.map((it) => (
                        <li key={it.href + it.label}>
                          <Link href={it.href} className="flex justify-between px-4 py-3 text-navy-800">
                            {it.label}
                            {it.note && <span className="text-sm text-navy-400">{it.note}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              <Link href="/admissions#enquire" className="btn-gold py-3 font-semibold">
                Enquire now
              </Link>
              <Link href="/portal" className="btn-primary py-3">
                <LogIn className="h-4 w-4" /> Portal login for parents, students and teachers
              </Link>
              {phone && (
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="btn-ghost py-3">
                  <Phone className="h-4 w-4" /> {phone}
                </a>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
