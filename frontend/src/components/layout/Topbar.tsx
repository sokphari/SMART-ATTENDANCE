"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Moon, PanelLeft, QrCode, ScanLine, Search, Sun } from "lucide-react";
import { findNavItem } from "@/config/nav";
import type { AuthUser } from "@/types/auth";
import { BackendStatus } from "@/components/shared/BackendStatus";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getInitials } from "@/lib/utils/name";

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
  const current = findNavItem(pathname);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-hairline bg-card/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="hidden size-9 cursor-pointer items-center justify-center rounded-control text-slate-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700 lg:flex"
        >
          <PanelLeft className="size-5" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-2 lg:hidden"
          aria-label="Smart Attendance home"
        >
          <span className="flex size-7 items-center justify-center rounded-[10px] bg-gradient-to-br from-brand-500 to-indigo-600 text-white">
            <QrCode className="size-4" />
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight">
            Smart<span className="text-brand-600">Attendance</span>
          </span>
        </Link>

        {current && (
          <span className="font-display hidden text-sm font-bold text-slate-400 lg:inline">
            {current.label}
          </span>
        )}

        <form
          className="relative hidden xl:block"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            aria-label="Global search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search workspace"
            className="h-9 w-52 rounded-control border border-hairline bg-card pl-9 pr-3 text-xs text-ink outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </form>
      </div>

      <div className="flex items-center gap-3">
        <select
          aria-label="Academic term"
          defaultValue="2026-2027-s1"
          className="hidden h-9 rounded-control border border-hairline bg-card px-2 text-xs font-semibold text-muted outline-none lg:block"
        >
          <option value="2026-2027-s1">Sem 1 · 2026–2027</option>
          <option value="2026-2027-s2">Sem 2 · 2026–2027</option>
        </select>
        <Link
          href="/attendance"
          className="hidden h-9 items-center gap-1.5 rounded-control bg-brand-600 px-3 text-xs font-bold text-white transition hover:bg-brand-700 md:flex"
        >
          <ScanLine className="size-3.5" />
          Quick Scan
        </Link>
        <BackendStatus />
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
          title={`Switch to ${darkMode ? "light" : "dark"} mode`}
          className="flex size-9 cursor-pointer items-center justify-center rounded-control border border-hairline bg-card text-slate-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <NotificationBell />
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              className="flex cursor-pointer items-center gap-2.5 rounded-pill border border-hairline bg-card py-1.5 pr-3 pl-1.5 transition-colors hover:bg-brand-50"
            >
              <span className="flex size-7 items-center justify-center rounded-pill bg-brand-600 text-[11px] font-bold text-white">
                {getInitials(user.name)}
              </span>
              <span className="hidden max-w-40 truncate text-sm leading-none font-semibold sm:inline">
                {user.name}
              </span>
            </button>
            {profileOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close profile menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute top-full right-0 z-50 mt-2 w-56 rounded-panel border border-hairline bg-card p-2 shadow-lift"
                >
                  <div className="border-b border-hairline px-3 py-2">
                    <p className="truncate text-sm font-bold">{user.name}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted capitalize">
                      {user.role ?? "user"}
                    </p>
                  </div>
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
                    Sign out
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
