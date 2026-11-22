"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandIcon } from "@/components/ui/BrandLogo";
import { BottomTabBar } from "./BottomTabBar";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AppBreadcrumbs } from "./AppBreadcrumbs";
import { logout } from "@/features/auth/api";
import { clearSession, getStoredUser, getToken } from "@/lib/api/session";
import type { AuthUser } from "@/types/auth";
import { clearAuthCookie } from "@/app/actions/auth";
import { TEACHER_NAV_ITEMS } from "@/config/nav";
import { fetchTeacherPermissions } from "@/features/users/api";
import { useLocale } from "@/i18n/LocaleProvider";

const SIDEBAR_KEY = "sa_sidebar_collapsed";
const THEME_KEY = "sa_theme";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLocale();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [teacherModules, setTeacherModules] = useState<string[]>([]);
  const isTeacherPath = pathname === "/teacher" || pathname.startsWith("/teacher/");

  useEffect(() => {
    if (!getToken()) {
      // This layout is already mounted without a valid client session. Use a
      // full navigation so an interrupted App Router transition cannot leave
      // the loading shell on screen indefinitely.
      window.location.replace("/login");
      return;
    }

    const storedUser = getStoredUser();
    setUser(storedUser);
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const useDarkMode = storedTheme === "dark";
    document.documentElement.classList.toggle("dark", useDarkMode);
    setDarkMode(useDarkMode);
    if (storedUser?.role?.toLowerCase() === "teacher") {
      fetchTeacherPermissions()
        .then(({ data }) => setTeacherModules(Object.keys(data).filter((key) => data[key])))
        .catch(() => setTeacherModules([]))
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    const handleUserUpdated = (event: Event) => {
      const updatedUser = (event as CustomEvent<AuthUser>).detail;
      if (updatedUser) setUser(updatedUser);
    };
    window.addEventListener("smart-attendance:user-updated", handleUserUpdated);
    return () => window.removeEventListener("smart-attendance:user-updated", handleUserUpdated);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    const isTeacher = user.role?.toLowerCase() === "teacher";
    if (isTeacher && !isTeacherPath) router.replace("/teacher/dashboard");
    if (!isTeacher && isTeacherPath) router.replace("/dashboard");
    if (isTeacher) {
      const currentModule = TEACHER_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
      if (currentModule?.permissionKey && !teacherModules.includes(currentModule.permissionKey)) {
        const availableModule = TEACHER_NAV_ITEMS.find((item) => item.permissionKey && teacherModules.includes(item.permissionKey));
        if (availableModule) router.replace(availableModule.href);
      }
    }
  }, [isTeacherPath, pathname, ready, router, teacherModules, user]);

  const isTeacher = user?.role?.toLowerCase() === "teacher";
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const noTeacherModules = ready && isTeacher && teacherModules.length === 0;
  const currentTeacherModule = isTeacher
    ? TEACHER_NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    : undefined;
  const noAccessRedirectPending = Boolean(
    isTeacher && teacherModules.length > 0 && currentTeacherModule?.permissionKey && !teacherModules.includes(currentTeacherModule.permissionKey),
  );

  const roleBlockedRoute = ready && user && (
    (user.role?.toLowerCase() === "teacher" && !isTeacherPath) ||
    (user.role?.toLowerCase() !== "teacher" && isTeacherPath) ||
    noAccessRedirectPending
  );

  const toggleSidebar = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setDarkMode((previous) => {
      const next = !previous;
      document.documentElement.classList.toggle("dark", next);
      window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Session is cleared locally regardless of the API result.
    }
    clearSession();
    await clearAuthCookie();
    router.replace("/login");
  }, [router]);

  if (!ready || roleBlockedRoute) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="animate-pulse-ring rounded-panel shadow-lift"><BrandIcon size={48} /></div>
      </div>
    );
  }

  if (noTeacherModules) {
    return <div className="flex min-h-dvh items-center justify-center bg-canvas px-5"><div className="max-w-lg rounded-panel border border-hairline bg-card p-8 text-center shadow-soft"><h1 className="font-display text-xl font-bold">{t("Teacher access is disabled")}</h1><p className="mt-2 text-sm leading-relaxed text-muted">{t("An administrator has turned off all teacher modules. Contact your administrator to restore access.")}</p><button type="button" onClick={() => void handleLogout()} className="mt-5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">{t("Sign out")}</button></div></div>;
  }

  if (ready && user && !isTeacher && !isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas px-5">
        <div className="max-w-lg rounded-panel border border-hairline bg-card p-8 text-center shadow-soft">
          <h1 className="font-display text-xl font-bold">{t("Workspace unavailable")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("This account does not have an enabled workspace. Contact an administrator for access.")}</p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-5 rounded-control bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >{t("Sign out")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} user={user} teacherModules={teacherModules} />
      <div
        className={`flex min-h-dvh flex-col transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-[76px]" : "lg:pl-64"}`}
      >
        <Topbar
          user={user}
          darkMode={darkMode}
          onToggleSidebar={toggleSidebar}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
        <main className="w-full flex-1 px-4 pt-6 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
          <AppBreadcrumbs pathname={pathname} role={user?.role ?? null} />
          {children}
        </main>
      </div>
      <BottomTabBar role={user?.role ?? null} teacherModules={teacherModules} />
    </div>
  );
}
