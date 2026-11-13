"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode } from "lucide-react";
import { NAV_SECTIONS } from "@/config/nav";
import { getInitials } from "@/lib/utils/name";
import type { AuthUser } from "@/types/auth";
import { cx } from "@/lib/utils/cx";

type SidebarProps = {
  collapsed: boolean;
  user: AuthUser | null;
};

export function Sidebar({ collapsed, user }: SidebarProps) {
  const pathname = usePathname();

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
          aria-label="Smart Attendance home"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-soft">
            <QrCode className="size-5" />
          </span>
          {!collapsed && (
            <span className="font-display text-[15px] leading-tight font-extrabold tracking-tight">
              Smart<span className="text-brand-600">Attendance</span>
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                      className={cx(
                        "group relative flex h-10 items-center rounded-control text-sm font-medium transition-all duration-200",
                        collapsed ? "justify-center" : "gap-3 px-3",
                        active
                          ? "bg-brand-600 text-white shadow-soft"
                          : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
                      )}
                    >
                      <item.icon
                        className={cx(
                          "size-[18px] shrink-0 transition-transform duration-200",
                          !active && "group-hover:scale-110",
                        )}
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
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
        ))}
      </nav>

      <div className="shrink-0 border-t border-hairline p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-pill bg-brand-600 text-[11px] font-bold text-white">
              {user ? getInitials(user.name) : "?"}
            </span>
          </div>
        ) : (
          user && (
            <div className="flex items-center gap-3 rounded-panel bg-canvas p-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-brand-600 text-[11px] font-bold text-white">
                {getInitials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.name}</p>
                <p className="truncate text-xs font-medium text-muted capitalize">
                  {user.role ?? "user"}
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
