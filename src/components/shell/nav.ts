import type { RoleSlug } from "@/lib/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Not built yet — shown so the product shape is visible, but not clickable. */
  soon?: boolean;
};

export type IconName =
  | "home"
  | "users"
  | "calendar"
  | "check"
  | "wallet"
  | "megaphone"
  | "book"
  | "clipboard"
  | "file"
  | "receipt"
  | "chart";

export const NAV: Record<RoleSlug, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: "home" },
    { label: "People", href: "/admin/people", icon: "users" },
    { label: "Schedule", href: "/admin/schedule", icon: "calendar", soon: true },
    { label: "Attendance", href: "/admin/attendance", icon: "check", soon: true },
    { label: "Finance", href: "/admin/finance", icon: "wallet", soon: true },
    { label: "Announcements", href: "/admin/announcements", icon: "megaphone", soon: true },
  ],
  teacher: [
    { label: "Today", href: "/teacher", icon: "home" },
    { label: "My students", href: "/teacher/students", icon: "users", soon: true },
    { label: "Sessions", href: "/teacher/sessions", icon: "calendar", soon: true },
    { label: "Resources", href: "/teacher/resources", icon: "book", soon: true },
  ],
  student: [
    { label: "Home", href: "/student", icon: "home" },
    { label: "Timetable", href: "/student/timetable", icon: "calendar", soon: true },
    { label: "Resources", href: "/student/resources", icon: "book", soon: true },
    { label: "Homework", href: "/student/homework", icon: "clipboard", soon: true },
  ],
  parent: [
    { label: "My children", href: "/parent", icon: "home" },
    { label: "Reports", href: "/parent/reports", icon: "chart", soon: true },
    { label: "Invoices", href: "/parent/invoices", icon: "receipt", soon: true },
  ],
};
