"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { QrCode } from "lucide-react";
import { BottomTabBar } from "./BottomTabBar";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { logout } from "@/features/auth/api";
import { clearSession, getStoredUser, getToken } from "@/lib/api/session";
import type { AuthUser } from "@/types/auth";
import { clearAuthCookie } from "@/app/actions/auth";

const SIDEBAR_KEY = "sa_sidebar_collapsed";
const THEME_KEY = "sa_theme";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    setUser(getStoredUser());
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const useDarkMode = storedTheme === "dark";
    document.documentElement.classList.toggle("dark", useDarkMode);
    setDarkMode(useDarkMode);
    setReady(true);
  }, [router]);

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

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="animate-pulse-ring flex size-12 items-center justify-center rounded-panel bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lift">
          <QrCode className="size-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Sidebar collapsed={collapsed} user={user} />
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
          {children}
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
