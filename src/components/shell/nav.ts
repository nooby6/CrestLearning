import type { RoleSlug } from "@/lib/roles";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
  /** Not built yet — shown to the office only, so the product shape is visible. Never used in other portals. */
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
    { label: "Resources", href: "/admin/resources", icon: "book" },
    { label: "Teacher payments", href: "/admin/payments", icon: "wallet" },
    { label: "Fees & invoices", href: "/admin/finance", icon: "receipt" },
    { label: "Announcements", href: "/admin/announcements", icon: "megaphone" },
  ],
  teacher: [
    { label: "Today", href: "/teacher", icon: "home" },
    { label: "My students", href: "/teacher/students", icon: "users" },
    { label: "Timetable", href: "/teacher/timetable", icon: "calendar" },
    { label: "Lesson records", href: "/teacher/records", icon: "clipboard", also: ["/teacher/sessions"] },
    { label: "Weekly reports", href: "/teacher/reports", icon: "chart" },
    { label: "Resources", href: "/teacher/resources", icon: "book" },
    { label: "Payments", href: "/teacher/payments", icon: "wallet" },
    { label: "Announcements", href: "/teacher/announcements", icon: "megaphone" },
  ],
  student: [
    { label: "Home", href: "/student", icon: "home" },
    { label: "Timetable", href: "/student/timetable", icon: "calendar" },
    { label: "Worksheets & files", href: "/student/work", icon: "book" },
    { label: "Homework", href: "/student/homework", icon: "clipboard" },
    { label: "Announcements", href: "/student/announcements", icon: "megaphone" },
  ],
  parent: [
    { label: "Overview", href: "/parent", icon: "home" },
    { label: "Timetable", href: "/parent/timetable", icon: "calendar" },
    { label: "Weekly reports", href: "/parent/reports", icon: "chart" },
    { label: "Schoolwork", href: "/parent/work", icon: "book" },
    { label: "Fees & invoices", href: "/parent/invoices", icon: "receipt" },
    { label: "Announcements", href: "/parent/announcements", icon: "megaphone" },
  ],
};
