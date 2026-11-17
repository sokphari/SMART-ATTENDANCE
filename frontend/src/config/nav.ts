import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  Gauge,
  GraduationCap,
  Layers,
  ScrollText,
  ShieldCheck,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  endpoint?: string;
  permissionKey?: string;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Gauge,
    description: "Live snapshot of people, classes, and attendance.",
  },
  {
    label: "Students",
    href: "/students",
    icon: GraduationCap,
    description: "Student records, profiles, and enrollment status.",
    endpoint: "/api/v1/admin/students",
  },
  {
    label: "Teachers",
    href: "/teachers",
    icon: Users,
    description: "Teaching staff and course assignments.",
    endpoint: "/api/v1/admin/teachers",
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    description: "Academic departments and their catalogs.",
    endpoint: "/api/v1/admin/departments",
  },
  {
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
    description: "The full course catalog, organized by department.",
    endpoint: "/api/v1/admin/courses",
  },
  {
    label: "Academic Years",
    href: "/academic-years",
    icon: CalendarRange,
    description: "Manage academic years and their date ranges.",
    endpoint: "/api/v1/admin/academic-years",
  },
  {
    label: "Semesters",
    href: "/semesters",
    icon: CalendarDays,
    description: "Manage semester dates within academic years.",
    endpoint: "/api/v1/admin/semesters",
  },
  {
    label: "Class Sections",
    href: "/class-sections",
    icon: Layers,
    description: "Sections with capacity, rooms, and semesters.",
    endpoint: "/api/v1/admin/class-sections",
  },
  {
    label: "Schedules",
    href: "/schedules",
    icon: CalendarClock,
    description: "Weekly timetables with conflict validation.",
    endpoint: "/api/v1/admin/class-schedules",
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: CheckCircle2,
    description: "Sessions, QR tokens, and every check-in.",
    endpoint: "/api/v1/admin/attendance",
  },
  {
    label: "Corrections",
    href: "/corrections",
    icon: FilePenLine,
    description: "Correction requests and admin decisions.",
    endpoint: "/api/v1/admin/attendance-corrections",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Attendance rates and per-section breakdowns.",
    endpoint: "/api/v1/admin/reports/attendance",
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: ScrollText,
    description: "Every correction action, tracked end to end.",
    endpoint: "/api/v1/admin/audit-logs",
  },
  {
    label: "Users & accounts",
    href: "/users",
    icon: Users,
    description: "Manage login accounts and teacher access status.",
    endpoint: "/api/v1/admin/users",
  },
  {
    label: "Roles & permissions",
    href: "/roles-permissions",
    icon: ShieldCheck,
    description: "Control which modules teacher accounts can access.",
    endpoint: "/api/v1/admin/role-permissions",
  },
];

export const TEACHER_NAV_ITEMS: NavItem[] = [
  {
    label: "Teacher dashboard",
    href: "/teacher/dashboard",
    icon: Gauge,
    description: "Your assigned classes and attendance activity.",
    permissionKey: "dashboard",
  },
  {
    label: "My classes",
    href: "/teacher/classes",
    icon: BookOpen,
    description: "Sections, rosters, schedules, and classrooms assigned to you.",
    endpoint: "/api/v1/teacher/class-sections",
    permissionKey: "classes",
  },
  {
    label: "Attendance sessions",
    href: "/teacher/attendance-sessions",
    icon: ClipboardList,
    description: "Open sessions, mark attendance, and review class records.",
    endpoint: "/api/v1/teacher/attendance-sessions",
    permissionKey: "attendance_sessions",
  },
  {
    label: "Attendance history",
    href: "/teacher/attendance-history",
    icon: CheckCircle2,
    description: "Review attendance records for your assigned sections.",
    endpoint: "/api/v1/teacher/attendance",
    permissionKey: "attendance_history",
  },
  {
    label: "Corrections",
    href: "/teacher/corrections",
    icon: FilePenLine,
    description: "Request and track corrections to closed session records.",
    endpoint: "/api/v1/teacher/attendance-corrections",
    permissionKey: "corrections",
  },
  {
    label: "Attendance reports",
    href: "/teacher/reports/attendance",
    icon: BarChart3,
    description: "Review attendance totals and rates for your classes.",
    endpoint: "/api/v1/teacher/reports/attendance",
    permissionKey: "attendance_reports",
  },
  {
    label: "My profile",
    href: "/teacher/profile",
    icon: UserRound,
    description: "View your signed-in teacher account details.",
    endpoint: "/api/v1/auth/me",
    permissionKey: "profile",
  },
];

export const TEACHER_NAV_SECTIONS: NavSection[] = [
  { label: "Overview", items: TEACHER_NAV_ITEMS.slice(0, 1) },
  { label: "Teaching", items: TEACHER_NAV_ITEMS.slice(1) },
];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: ALL_NAV_ITEMS.filter((item) => item.href === "/dashboard"),
  },
  {
    label: "People",
    items: ALL_NAV_ITEMS.filter((item) =>
      ["/students", "/teachers", "/users", "/roles-permissions"].includes(item.href),
    ),
  },
  {
    label: "Academics",
    items: ALL_NAV_ITEMS.filter((item) =>
      ["/departments", "/courses", "/academic-years", "/semesters", "/class-sections", "/schedules"].includes(
        item.href,
      ),
    ),
  },
  {
    label: "Attendance",
    items: ALL_NAV_ITEMS.filter((item) =>
      [
        "/attendance",
        "/corrections",
        "/reports",
        "/audit-logs",
      ].includes(item.href),
    ),
  },
];

export const MOBILE_TABS: NavItem[] = ALL_NAV_ITEMS.filter((item) =>
  ["/dashboard", "/students", "/attendance", "/reports"].includes(item.href),
);

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ) ?? TEACHER_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
