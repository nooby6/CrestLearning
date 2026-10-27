import type { RoleSlug } from "@/lib/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Not built yet — shown so the product shape is visible, but not clickable. */
  soon?: boolean;
  /** Other path prefixes that should highlight this item. */
  also?: string[];
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
  | "chart"
  | "link";

export const NAV: Record<RoleSlug, NavItem[]> = {
  admin: [
    { label: "Overview", href: "/admin", icon: "home" },
    { label: "People", href: "/admin/people", icon: "users" },
    { label: "Enrollments", href: "/admin/enrollments", icon: "link" },
    { label: "Schedule", href: "/admin/schedule", icon: "calendar", also: ["/admin/sessions"] },
    { label: "Attendance", href: "/admin/attendance", icon: "check" },
    { label: "Weekly reports", href: "/admin/reports", icon: "chart" },
    { label: "Finance", href: "/admin/finance", icon: "wallet", soon: true },
    { label: "Announcements", href: "/admin/announcements", icon: "megaphone", soon: true },
  ],
  teacher: [
    { label: "Today", href: "/teacher", icon: "home" },
    { label: "My students", href: "/teacher/students", icon: "users" },
    { label: "Timetable", href: "/teacher/timetable", icon: "calendar" },
    { label: "Lesson records", href: "/teacher/records", icon: "clipboard", also: ["/teacher/sessions"] },
    { label: "Weekly reports", href: "/teacher/reports", icon: "chart" },
    { label: "Resources", href: "/teacher/resources", icon: "book", soon: true },
  ],
  student: [
    { label: "Home", href: "/student", icon: "home" },
    { label: "Timetable", href: "/student/timetable", icon: "calendar" },
    { label: "Resources", href: "/student/resources", icon: "book", soon: true },
    { label: "Homework", href: "/student/homework", icon: "clipboard" },
  ],
  parent: [
    { label: "Overview", href: "/parent", icon: "home" },
    { label: "Timetable", href: "/parent/timetable", icon: "calendar" },
    { label: "Weekly reports", href: "/parent/reports", icon: "chart" },
    { label: "Invoices", href: "/parent/invoices", icon: "receipt", soon: true },
  ],
};
