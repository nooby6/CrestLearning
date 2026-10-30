"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  Link2,
  Megaphone,
  Menu,
  Receipt,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import type { IconName, NavItem } from "./nav";

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  users: Users,
  calendar: CalendarDays,
  check: CheckCircle2,
  wallet: Wallet,
  megaphone: Megaphone,
  book: BookOpen,
  clipboard: ClipboardList,
  file: FileText,
  receipt: Receipt,
  chart: BarChart3,
  link: Link2,
};

function NavList({ items, onNavigate, badges }: { items: NavItem[]; onNavigate?: () => void; badges?: Record<string, number> }) {
  const pathname = usePathname();
  // Most specific match wins, so "/admin" isn't active on "/admin/people".
  const matches = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const active = items
    .filter((i) => !i.soon)
    .flatMap((i) => [i.href, ...(i.also ?? [])].filter(matches).map((m) => ({ href: i.href, len: m.length })))
    .sort((a, b) => b.len - a.len)[0]?.href;

  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        if (item.soon) {
          return (
            <li key={item.href}>
              <span
                className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-300/70"
                title="Coming in a later module"
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                <span className=" border border-navy-600 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-navy-300">
                  Soon
                </span>
              </span>
            </li>
          );
        }
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                isActive
                  ? "bg-navy-700 font-medium text-white"
                  : "text-navy-200 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {isActive && <span className="absolute inset-y-0 left-0 w-1 bg-gold-500" />}
              <Icon
                className={clsx("h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-0.5", isActive && "text-gold-400")}
                strokeWidth={1.75}
              />
              <span className="flex-1">{item.label}</span>
              {badges?.[item.href] ? (
                <span
                  className={clsx(
                  "min-w-[20px] px-1.5 text-center text-[11px] font-semibold tabular-nums",
                    item.href.endsWith("/records") ? "bg-rose-500 text-white" : "bg-gold-500 text-navy-950",
                  )}
                >
                  {badges[item.href]}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Panel({ items, roleLabel, onNavigate, badges }: { items: NavItem[]; roleLabel: string; onNavigate?: () => void; badges?: Record<string, number> }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Link href="/" onClick={onNavigate}>
          <Wordmark tone="light" />
        </Link>
      </div>
      <p className="px-6 pb-2 font-display text-[10px] font-semibold uppercase tracking-crest text-gold-400">
        {roleLabel}
      </p>
      <nav className="flex-1 px-3">
        <NavList items={items} onNavigate={onNavigate} badges={badges} />
      </nav>
      <div className="px-6 pb-6">
        <div className="mb-3 h-px bg-navy-600" />
        <p className="font-display text-[9px] font-semibold tracking-[0.3em] text-navy-300">
          LEARN. GROW. EXCEL.
        </p>
      </div>
    </div>
  );
}

export function Sidebar({ items, roleLabel, badges }: { items: NavItem[]; roleLabel: string; badges?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside className="sidebar-bg sticky top-0 hidden h-screen w-64 shrink-0 lg:block print:hidden">
        <Panel items={items} roleLabel={roleLabel} badges={badges} />
      </aside>

      {/* Mobile trigger (rendered in the topbar slot) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800 text-white lg:hidden print:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="fade-in absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="sidebar-bg absolute inset-y-0 left-0 w-72">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1.5 text-navy-200 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Panel items={items} roleLabel={roleLabel} badges={badges} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
