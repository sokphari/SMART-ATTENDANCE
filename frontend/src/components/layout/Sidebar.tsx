"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandIcon, BrandLogo } from "@/components/ui/BrandLogo";
import {
  ADMIN_NAV_SECTIONS,
  NAV_SECTIONS,
  STUDENT_NAV_SECTIONS,
  TEACHER_NAV_SECTIONS,
} from "@/config/nav";
import type { AuthUser } from "@/types/auth";
import { cx } from "@/lib/utils/cx";
import { useLocale } from "@/i18n/LocaleProvider";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

type SidebarProps = {
  collapsed: boolean;
  user: AuthUser | null;
  teacherModules?: string[];
};

export function Sidebar({
  collapsed,
  user,
  teacherModules = [],
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const role = user?.role?.toLowerCase() ?? "user";
  const sections =
    user?.role?.toLowerCase() === "teacher"
      ? TEACHER_NAV_SECTIONS.map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.permissionKey && teacherModules.includes(item.permissionKey),
          ),
        })).filter((section) => section.items.length > 0)
      : user?.role?.toLowerCase() === "student"
        ? STUDENT_NAV_SECTIONS
        : user?.role?.toLowerCase() === "admin"
          ? ADMIN_NAV_SECTIONS
          : NAV_SECTIONS;
  const preferenceKey = `sa_nav_groups_${role}`;
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "Quick Access",
  ]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(preferenceKey);
      setExpandedGroups(
        saved ? (JSON.parse(saved) as string[]) : ["Quick Access"],
      );
    } catch {
      setExpandedGroups(["Quick Access"]);
    }
  }, [preferenceKey]);

  const activeGroup = useMemo(
    () =>
      sections.find((section) =>
        section.items.some(
          (item) =>
            pathname === item.href || pathname.startsWith(`${item.href}/`),
        ),
      )?.label,
    [pathname, sections],
  );

  useEffect(() => {
    if (!activeGroup) return;
    setExpandedGroups((current) => {
      if (current.includes(activeGroup)) return current;
      const next = [...current, activeGroup];
      try {
        window.localStorage.setItem(preferenceKey, JSON.stringify(next));
      } catch {
        // The expanded state still works for this session if storage is unavailable.
      }
      return next;
    });
  }, [activeGroup, preferenceKey]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((current) => {
      const next = current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label];
      try {
        window.localStorage.setItem(preferenceKey, JSON.stringify(next));
      } catch {
        // Keep the in-memory preference when local storage is unavailable.
      }
      return next;
    });
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside
      className={cx(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-card transition-[width] duration-300 ease-out lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div
        className={cx(
          "flex h-16 shrink-0 items-center border-b border-hairline",
          collapsed ? "justify-center px-0" : "gap-3 px-4",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-control"
          aria-label={t("Smart Attendance home")}
        >
          {collapsed ? <BrandIcon size={36} /> : <BrandLogo iconSize={36} />}
        </Link>
      </div>

      <nav
        aria-label={t("Main navigation")}
        className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-4"
      >
        {sections.map((section) => {
          const expanded =
            section.collapsible === false ||
            expandedGroups.includes(section.label);
          const GroupIcon = section.icon;
          const groupIsActive = activeGroup === section.label;
          const groupId = `sidebar-group-${role}-${section.label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <div key={section.label}>
              {section.collapsible === false ? (
                collapsed ? (
                  <div
                    className="mb-2 flex h-7 items-center justify-center text-muted"
                    title={t(section.label)}
                  >
                    {GroupIcon && (
                      <GroupIcon aria-hidden="true" className="size-4" />
                    )}
                  </div>
                ) : (
                  <p className="mb-1 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
                    {t(section.label)}
                  </p>
                )
              ) : (
                <button
                  type="button"
                  aria-label={t(section.label)}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  title={collapsed ? t(section.label) : undefined}
                  onClick={() => toggleGroup(section.label)}
                  className={cx(
                    "group flex min-h-12 w-full items-center rounded-xl border text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    expanded || groupIsActive
                      ? "border-brand-500/35 bg-brand-50/80 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "border-transparent text-ink/75 hover:border-hairline hover:bg-canvas hover:text-ink",
                  )}
                >
                  {GroupIcon && (
                    <span className={cx(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      expanded || groupIsActive
                        ? "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                        : "bg-canvas text-muted group-hover:text-brand-600",
                    )}>
                      <GroupIcon aria-hidden="true" className="size-[18px]" />
                    </span>
                  )}
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">
                        {t(section.label)}
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className={cx("size-4 shrink-0 text-muted transition-transform duration-200", expanded && "rotate-180")}
                      />
                    </>
                  )}
                </button>
              )}
              <ul
                id={section.collapsible === false ? undefined : groupId}
                aria-label={section.collapsible === false ? undefined : t(section.label)}
                hidden={!expanded}
                className={cx(
                  "mt-1 space-y-1",
                  !collapsed && section.collapsible !== false && "relative ml-[22px] border-l border-hairline py-1 pl-3",
                )}
              >
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={collapsed ? t(item.label) : undefined}
                          aria-label={t(item.label)}
                          aria-current={active ? "page" : undefined}
                          className={cx(
                            "group relative flex min-h-10 items-center rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                            collapsed ? "justify-center" : "gap-3 px-3",
                            active
                              ? "bg-brand-600 text-white shadow-soft"
                              : "text-ink/75 hover:bg-canvas hover:text-brand-600",
                          )}
                        >
                          {!collapsed && section.collapsible !== false && (
                            <span
                              aria-hidden="true"
                              className={cx(
                                "absolute -left-[19px] size-2.5 rounded-pill border-2 border-card transition-colors",
                                active ? "bg-brand-500" : "bg-muted/40 group-hover:bg-brand-400",
                              )}
                            />
                          )}
                          <item.icon
                            className={cx(
                              "size-[18px] shrink-0 transition-transform duration-200",
                              !active && "group-hover:scale-105",
                            )}
                          />
                          {!collapsed && (
                            <>
                              <span className="truncate">{t(item.label)}</span>
                              {active && (
                                <span className="ml-auto size-1.5 rounded-pill bg-white/90" />
                              )}
                            </>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
