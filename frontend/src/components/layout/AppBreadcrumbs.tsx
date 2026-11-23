"use client";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useLocale } from "@/i18n/LocaleProvider";
import { ALL_NAV_ITEMS, STUDENT_NAV_ITEMS, TEACHER_NAV_ITEMS } from "@/config/nav";
import { buildBreadcrumbs } from "@/lib/navigation/breadcrumbs";

type AppBreadcrumbsProps = {
  pathname: string;
  role: string | null;
};

/**
 * Renders consistent breadcrumbs across authenticated pages.
 * BuildingsView supplies its own breadcrumb to reflect the in-page wizard.
 */
export function AppBreadcrumbs({ pathname, role }: AppBreadcrumbsProps) {
  const { t } = useLocale();
  if (pathname === "/buildings") return null;

  const teacherArea = role?.toLowerCase() === "teacher";
  const rootHref = teacherArea ? "/teacher/dashboard" : "/dashboard";
  const items = teacherArea ? TEACHER_NAV_ITEMS : role?.toLowerCase() === "student" ? STUDENT_NAV_ITEMS : ALL_NAV_ITEMS;
  const breadcrumbs = buildBreadcrumbs(pathname, rootHref, items);

  return <Breadcrumb items={breadcrumbs.map((item) => ({ ...item, label: t(item.label) }))} className="mb-3" />;
}
