import type { BreadcrumbItem } from "@/components/ui/Breadcrumb";

export type BreadcrumbNavItem = {
  label: string;
  href: string;
};

const detailLabels: Record<string, string> = {
  "/students": "Student Details",
  "/teachers": "Teacher Details",
  "/departments": "Department Details",
  "/courses": "Course Details",
  "/academic-years": "Academic Year Details",
  "/semesters": "Semester Details",
  "/class-sections": "Class Details",
  "/schedules": "Schedule Details",
  "/teacher/classes": "Class Details",
  "/teacher/attendance-sessions": "Session Details",
};

const singularLabels: Record<string, string> = {
  "/students": "Student",
  "/teachers": "Teacher",
  "/departments": "Department",
  "/courses": "Course",
  "/academic-years": "Academic Year",
  "/semesters": "Semester",
  "/class-sections": "Class Section",
  "/schedules": "Timetable",
  "/teacher/attendance-sessions": "Attendance Session",
  "/teacher/classes": "Class",
};

function readableLabel(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stepLabel(segment: string, parentHref: string, firstStep: boolean): string {
  const entity = singularLabels[parentHref] ?? "Record";
  if (firstStep && segment === "create") return "Create " + entity;
  if (segment === "edit") return "Edit " + entity;
  if (segment === "enrollments") return "Enrollments";
  if (segment === "attendance") return "Take Attendance";
  if (firstStep) return detailLabels[parentHref] ?? "Details";
  return readableLabel(segment);
}

/**
 * Generate route-aware breadcrumbs without exposing numeric record IDs.
 * Navigation is provided by the active role to avoid leaking links to
 * routes that don't belong to that role.
 */
export function buildBreadcrumbs(
  pathname: string,
  rootHref: string,
  navItems: readonly BreadcrumbNavItem[],
): BreadcrumbItem[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === rootHref) return [{ label: "Dashboard" }];

  const dashboard: BreadcrumbItem = { label: "Dashboard", href: rootHref };
  const parent = [...navItems]
    .filter((item) => path === item.href || path.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!parent) {
    // Unknown routes still have a safe path back to the correct dashboard.
    const last = path.split("/").filter(Boolean).pop() ?? "Page";
    return [dashboard, { label: /^\d+$/.test(last) ? "Details" : readableLabel(last) }];
  }

  if (path === parent.href) return [dashboard, { label: parent.label }];

  const crumbs: BreadcrumbItem[] = [dashboard, { label: parent.label, href: parent.href }];
  const tail = path.slice(parent.href.length).split("/").filter(Boolean);

  for (let index = 0; index < tail.length; index++) {
    const href = parent.href + "/" + tail.slice(0, index + 1).join("/");
    const isLast = index === tail.length - 1;
    crumbs.push({
      label: stepLabel(tail[index], parent.href, index === 0),
      ...(!isLast ? { href } : {}),
    });
  }

  return crumbs;
}
