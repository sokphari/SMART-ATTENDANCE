"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, X } from "lucide-react";
import { ADMIN_NAV_SECTIONS, MOBILE_TABS, NAV_SECTIONS, STUDENT_NAV_SECTIONS, TEACHER_NAV_ITEMS, TEACHER_NAV_SECTIONS } from "@/config/nav";
import { cx } from "@/lib/utils/cx";
import { useLocale } from "@/i18n/LocaleProvider";

export function BottomTabBar({ role, teacherModules = [] }: { role: string | null; teacherModules?: string[] }) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreCloseRef = useRef<HTMLButtonElement>(null);
  const moreDialogRef = useRef<HTMLDivElement>(null);
  const closeMore = () => {
    setMoreOpen(false);
    window.requestAnimationFrame(() => moreTriggerRef.current?.focus());
  };
  const isTeacher = role?.toLowerCase() === "teacher";
  const isAdmin = role?.toLowerCase() === "admin";
  const isStudent = role?.toLowerCase() === "student";
  const allowedTeacherItems = TEACHER_NAV_ITEMS.filter((item) => item.permissionKey && teacherModules.includes(item.permissionKey));
  const teacherTabOrder = ["/teacher/dashboard", "/teacher/classes", "/teacher/attendance-sessions"];
  const tabs = isTeacher
    ? teacherTabOrder.map((href) => allowedTeacherItems.find((item) => item.href === href)).filter((item): item is (typeof allowedTeacherItems)[number] => Boolean(item))
    : isStudent ? STUDENT_NAV_SECTIONS.flatMap((section) => section.items) : MOBILE_TABS;
  const sourceSections = isTeacher
    ? TEACHER_NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => allowedTeacherItems.some((allowed) => allowed.href === item.href)) }))
    : isStudent ? STUDENT_NAV_SECTIONS : isAdmin ? ADMIN_NAV_SECTIONS : NAV_SECTIONS;
  const moreSections = sourceSections
    .map((section) => ({ ...section, items: section.items.filter((item) => !tabs.some((tab) => tab.href === item.href)) }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    if (!moreOpen) return;
    moreCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMore();
      }
      if (event.key !== "Tab") return;
      const focusable = moreDialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("Close menu")}
            className="absolute inset-0 cursor-pointer bg-ink/40 backdrop-blur-sm"
            onClick={closeMore}
          />
          <div id="mobile-module-drawer" ref={moreDialogRef} role="dialog" aria-modal="true" aria-labelledby="mobile-module-drawer-title" className="animate-slide-up absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-hairline bg-card p-5 pb-10 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
                <h2 id="mobile-module-drawer-title" className="font-display text-base font-bold">
                {t("Browse modules")}
              </h2>
              <button
                type="button"
                ref={moreCloseRef}
                onClick={closeMore}
                aria-label={t("Close menu")}
                className="flex size-9 cursor-pointer items-center justify-center rounded-control text-slate-500 hover:bg-brand-50 hover:text-brand-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto">
              {moreSections.map((section) => <section key={section.label} aria-label={t(section.label)}>
                <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">{t(section.label)}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMore}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={cx(
                        "flex min-h-11 items-center gap-3 rounded-control p-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                        isActive(item.href)
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                          : "text-ink/75 hover:bg-canvas hover:text-brand-600",
                      )}
                    >
                      <item.icon className="size-4.5 shrink-0" />
                      <span className="truncate">{t(item.label)}</span>
                    </Link>
                  ))}
                </div>
              </section>)}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card/90 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className={`mx-auto grid max-w-2xl ${isTeacher ? "grid-cols-4" : isStudent ? "grid-cols-1" : "grid-cols-6"}`}>
          {tabs.map((tab) => {
            const active = isActive(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={t(tab.label)}
                className={cx(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors duration-200",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <tab.icon
                  className={cx("size-5", active && "drop-shadow-sm")}
                />
                {t(isTeacher && tab.label === "Dashboard" ? "Home" : isTeacher && tab.label === "Live Attendance" ? "Attendance" : tab.label)}
              </Link>
            );
          })}
          {((!isTeacher && !isStudent) || (isTeacher && moreSections.length > 0)) && <button
            type="button"
            ref={moreTriggerRef}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls="mobile-module-drawer"
            className="flex cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-slate-500 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <LayoutGrid className="size-5" />
            {t("More")}
          </button>}
        </div>
      </nav>
    </>
  );
}
