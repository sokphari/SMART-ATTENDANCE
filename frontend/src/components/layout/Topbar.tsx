"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LogOut,
  Moon,
  PanelLeft,
  ChevronDown,
  ShieldCheck,
  ScanLine,
  Search,
  Sun,
  UserRound,
  Settings,
  UsersRound,
  Maximize,
  Minimize,
} from "lucide-react";
import { findNavItem } from "@/config/nav";
import type { AuthUser } from "@/types/auth";
import { BackendStatus } from "@/components/shared/BackendStatus";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";
import { getInitials } from "@/lib/utils/name";
import { chooseInitialSemester, fetchSemesterOptions, MANUAL_SEMESTER_SELECTION_KEY, SELECTED_SEMESTER_KEY } from "@/features/schedules/api";
import type { SemesterOption } from "@/features/schedules/types";

type TopbarProps = {
  user: AuthUser | null;
  darkMode: boolean;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function Topbar({
  user,
  darkMode,
  onToggleSidebar,
  onToggleTheme,
  onLogout,
}: TopbarProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const current = findNavItem(pathname);
  const role = user?.role?.toLowerCase();
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";
  const canViewNotifications = role !== "teacher" && role !== "student";
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle fullscreen:", error);
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyF") {
        event.preventDefault();
        void toggleFullscreen();
      }
    };

    syncFullscreen();

    document.addEventListener("fullscreenchange", syncFullscreen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleFullscreen]);

  useEffect(() => {
    if (isTeacher) return;
    fetchSemesterOptions().then(({ data }) => {
      setSemesters(data);
      const chosen = chooseInitialSemester(data);
      if (chosen) {
        const value = String(chosen.id);
        setSelectedSemesterId(value);
        window.localStorage.setItem(SELECTED_SEMESTER_KEY, value);
        window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId: Number(value) } }));
      }
    }).catch(() => setSemesters([]));
  }, [isTeacher]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [profileOpen]);

  useEffect(() => {
    const focusGlobalSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", focusGlobalSearch);
    return () => window.removeEventListener("keydown", focusGlobalSearch);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-card/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t("Toggle sidebar")}
          className="hidden size-9 cursor-pointer items-center justify-center rounded-control text-slate-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700 lg:flex"
        >
          <PanelLeft className="size-5" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 lg:hidden"
          aria-label={t("Smart Attendance home")}
        >
          <BrandLogo iconSize={30} />
        </Link>

        {current && (
          <span className="font-display hidden text-sm font-bold text-slate-400 lg:inline">
            {t(current.label)}
          </span>
        )}

        <form
          className="relative hidden xl:block"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            aria-label={t("Global search with Ctrl + K")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("Search workspace")}
            className="h-9 w-52 rounded-control border border-hairline bg-card pl-9 pr-11 text-xs text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
          <kbd aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-hairline bg-canvas px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted">{t("Ctrl K")}</kbd>
        </form>
      </div>

      <div className="flex items-center gap-3">
        {!isTeacher && (
          <select
            aria-label={t("Academic term")}
            value={selectedSemesterId}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedSemesterId(value);
              window.localStorage.setItem(SELECTED_SEMESTER_KEY, value);
              window.localStorage.setItem(MANUAL_SEMESTER_SELECTION_KEY, "true");
              window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId: Number(value) } }));
            }}
            className="hidden h-9 rounded-control border border-hairline bg-card px-2 text-xs font-semibold text-muted outline-none lg:block"
          >
            {semesters.length === 0 && <option value="">{t("No semesters")}</option>}
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name} · {semester.academic_year?.name ?? `${semester.start_date}–${semester.end_date}`}
              </option>
            ))}
          </select>
        )}
        {!isTeacher && (
          <Link
            href="/attendance"
            className="hidden h-9 items-center gap-1.5 rounded-control bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700 md:flex"
          >
            <ScanLine className="size-3.5" />
            {t("Quick Scan")}
          </Link>
        )}
        <LanguageSwitcher compact />
        <BackendStatus />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={t(darkMode ? "Switch to light mode" : "Switch to dark mode")}
          role="switch"
          aria-checked={darkMode}
          title={t(darkMode ? "Dark mode on" : "Light mode on")}
          className={`relative flex h-9 w-16 shrink-0 cursor-pointer items-center rounded-pill p-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${darkMode ? "bg-brand-600" : "bg-slate-300"}`}
        >
          <Sun aria-hidden="true" className={`absolute left-1.5 size-3.5 ${darkMode ? "text-white/70" : "text-amber-700"}`} />
          <Moon aria-hidden="true" className={`absolute right-1.5 size-3.5 ${darkMode ? "text-white/70" : "text-slate-600"}`} />
          <span className={`z-10 flex size-7 items-center justify-center rounded-pill bg-white text-slate-700 shadow-sm transition-transform duration-200 ${darkMode ? "translate-x-7" : "translate-x-0"}`}>
            {darkMode ? <Moon aria-hidden="true" className="size-3.5" /> : <Sun aria-hidden="true" className="size-3.5 text-amber-500" />}
          </span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={t(isFullscreen ? "Exit fullscreen" : "Enter fullscreen")}
          aria-pressed={isFullscreen}
          title={
            isFullscreen
              ? "Exit fullscreen (Esc)"
              : "Fullscreen (Ctrl + Shift + F)"
          }
          className="
          flex size-9 cursor-pointer items-center justify-center
          rounded-control border border-hairline
          bg-card text-slate-500
          transition-colors duration-200
          hover:bg-brand-50 hover:text-brand-700
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-brand-500
        "
        >
          {isFullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Maximize className="size-4" />
          )}
        </button>

        {canViewNotifications && <NotificationBell />}
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label={t("Open profile menu")}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="flex cursor-pointer items-center gap-2.5 rounded-pill border border-hairline bg-card py-1.5 pr-3 pl-1.5 transition-colors hover:bg-brand-50"
            >
              <span className="flex size-7 items-center justify-center rounded-pill bg-brand-600 text-[11px] font-bold text-white">
                {getInitials(user.name)}
              </span>
              <span className="hidden max-w-40 flex-col items-start gap-0.5 sm:flex">
                <span className="truncate text-sm leading-none font-semibold">{user.name}</span>
                <span className="text-[10px] leading-none text-muted">{t(isAdmin ? "System Administrator" : user.role ?? "user")}</span>
              </span>
              <ChevronDown className="hidden size-3.5 text-muted sm:block" />
            </button>
            {profileOpen && (
              <>
                <button
                  type="button"
                  aria-label={t("Close profile menu")}
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute top-full right-0 z-50 mt-2 w-56 rounded-panel border border-hairline bg-card p-2 shadow-lift"
                >
                  <div className="border-b border-hairline px-3 py-2">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {user.email}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-muted">{t(isAdmin ? "System Administrator" : user.role ?? "user")}</p>
                  </div>
                  {isAdmin && (
                    <>
                      <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex min-h-10 w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                      >
                        <UserRound className="size-4 text-muted" />
                        {t("My profile")}
                      </Link>
                      <Link
                        href="/settings"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex min-h-10 w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                      >
                        <Settings className="size-4 text-muted" />
                        {t("Settings")}
                      </Link>
                      <div className="my-1 border-t border-hairline" />
                      <Link
                        href="/users"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="mt-1 flex min-h-10 w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                      >
                        <UsersRound className="size-4 text-muted" />
                        {t("Users & accounts")}
                      </Link>
                      <Link
                        href="/roles-permissions"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="flex min-h-10 w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                      >
                        <ShieldCheck className="size-4 text-muted" />
                        {t("Roles & permissions")}
                      </Link>
                    </>
                  )}
                  {isTeacher && (
                    <Link
                      href="/teacher/profile"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="mt-1 flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
                    >
                      <UserRound className="size-4" />
                      {t("My profile")}
                    </Link>
                  )}
                  {isAdmin && <div className="my-1 border-t border-hairline" />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                    className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
                  >
                    <LogOut className="size-4" />
                    {t("Sign out")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
