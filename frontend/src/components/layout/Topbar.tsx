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
import { SystemHealth } from "@/components/shared/SystemHealth";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";
import { getInitials } from "@/lib/utils/name";
import { chooseInitialSemester, fetchSemesterOptions, MANUAL_SEMESTER_SELECTION_KEY, SELECTED_SEMESTER_KEY, selectGlobalSemester } from "@/features/schedules/api";
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
  const [semesterLoading, setSemesterLoading] = useState(false);
  const [semesterError, setSemesterError] = useState("");
  const [invalidSemesterSelection, setInvalidSemesterSelection] = useState(false);
  const [semesterReload, setSemesterReload] = useState(0);

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
    if (!isAdmin) {
      setSemesters([]);
      setSelectedSemesterId("");
      return;
    }

    let cancelled = false;
    setSemesterLoading(true);
    setSemesterError("");
    fetchSemesterOptions().then(({ data }) => {
      if (cancelled) return;
      setSemesters(data);
      const storedId = window.localStorage.getItem(SELECTED_SEMESTER_KEY);
      const wasManuallySelected = window.localStorage.getItem(MANUAL_SEMESTER_SELECTION_KEY) === "true";
      const chosen = chooseInitialSemester(data);

      if (wasManuallySelected && (!storedId || !chosen)) {
        // Keep the user on an explicit empty state when their saved term was
        // removed, archived, or is no longer authorized. Never silently pick another.
        window.localStorage.removeItem(SELECTED_SEMESTER_KEY);
        setSelectedSemesterId("");
        setInvalidSemesterSelection(Boolean(storedId));
        window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId: null, invalid: Boolean(storedId) } }));
        return;
      }

      setInvalidSemesterSelection(false);
      if (chosen) {
        const value = String(chosen.id);
        setSelectedSemesterId(value);
        window.localStorage.setItem(SELECTED_SEMESTER_KEY, value);
        window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId: Number(value) } }));
      } else {
        setSelectedSemesterId("");
        window.localStorage.removeItem(SELECTED_SEMESTER_KEY);
        window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId: null } }));
      }
    }).catch((caught) => {
      if (cancelled) return;
      setSemesters([]);
      setSemesterError(caught instanceof Error ? caught.message : t("Could not load semesters."));
    }).finally(() => {
      if (!cancelled) setSemesterLoading(false);
    });

    return () => { cancelled = true; };
  }, [isAdmin, semesterReload, t]);

  useEffect(() => {
    const syncSelectedSemester = (event: Event) => {
      const detail = (event as CustomEvent<{ semesterId?: number | null }>).detail;
      if (!detail || !Object.prototype.hasOwnProperty.call(detail, "semesterId")) return;
      setSelectedSemesterId(detail.semesterId ? String(detail.semesterId) : "");
    };
    window.addEventListener("sa-semester-change", syncSelectedSemester);
    return () => window.removeEventListener("sa-semester-change", syncSelectedSemester);
  }, []);

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
        {isAdmin && (
          <div className="hidden items-center gap-2 lg:flex">
          <select
            aria-label={t("Academic term")}
            value={selectedSemesterId}
            disabled={semesterLoading || Boolean(semesterError) || semesters.length === 0}
            onChange={(event) => {
              const value = event.target.value;
              setSelectedSemesterId(value);
              setInvalidSemesterSelection(false);
              selectGlobalSemester(value ? Number(value) : null);
            }}
            className="h-9 max-w-56 rounded-control border border-hairline bg-card px-2 text-xs font-semibold text-muted outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{semesterLoading ? t("Loading semesters…") : semesterError ? t("Semester list unavailable") : semesters.length === 0 ? t("No semester available") : t("Select a semester")}</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name} · {semester.academic_year?.name ?? `${semester.start_date}–${semester.end_date}`}
              </option>
            ))}
          </select>
          {semesterError && <>
            <button type="button" title={semesterError} onClick={() => setSemesterReload((value) => value + 1)} className="text-xs font-semibold text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">{t("Retry")}</button>
            <span role="alert" className="sr-only">{semesterError}</span>
          </>}
          {!semesterLoading && !semesterError && semesters.length === 0 && <Link href="/semesters/create" className="text-xs font-semibold text-brand-600 hover:underline">{t("Set up")}</Link>}
          {invalidSemesterSelection && <span role="status" className="max-w-44 text-[11px] leading-tight text-warning">{t("The previously selected semester is unavailable. Please choose another.")}</span>}
          </div>
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
        {isAdmin && <SystemHealth />}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={t(darkMode ? "Switch to light mode" : "Switch to dark mode")}
          aria-pressed={darkMode}
          title={t(darkMode ? "Switch to light mode" : "Switch to dark mode")}
          className="hidden h-9 items-center gap-1 rounded-pill border border-hairline bg-canvas p-1 transition-colors hover:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex"
        >
          <span className={`flex size-7 items-center justify-center rounded-pill transition-colors ${!darkMode ? "bg-brand-600 text-white" : "text-muted"}`}><Sun className="size-4" /></span>
          <span className={`flex size-7 items-center justify-center rounded-pill transition-colors ${darkMode ? "bg-brand-600 text-white" : "text-muted"}`}><Moon className="size-4" /></span>
        </button>
        <button
          type="button"
          aria-label={t(isFullscreen ? "Exit fullscreen" : "Enter fullscreen")}
          title={t(isFullscreen ? "Exit fullscreen" : "Enter fullscreen")}
          aria-pressed={isFullscreen}
          onClick={() => void toggleFullscreen()}
          className="hidden size-9 items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:flex"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
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
