"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, X } from "lucide-react";
import { ALL_NAV_ITEMS, MOBILE_TABS } from "@/config/nav";
import { cx } from "@/lib/utils/cx";

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-pointer bg-ink/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="animate-slide-up absolute inset-x-0 bottom-0 rounded-t-[20px] border-t border-hairline bg-card p-5 pb-10 shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold">
                Browse modules
              </h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="flex size-9 cursor-pointer items-center justify-center rounded-control text-slate-500 hover:bg-brand-50 hover:text-brand-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto">
              {ALL_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cx(
                    "flex items-center gap-3 rounded-control p-3 text-sm font-semibold transition-colors duration-200",
                    isActive(item.href)
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-canvas",
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-card/90 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const active = isActive(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                className={cx(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors duration-200",
                  active ? "text-brand-600" : "text-slate-500",
                )}
              >
                <tab.icon
                  className={cx("size-5", active && "drop-shadow-sm")}
                />
                {tab.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex cursor-pointer flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-slate-500 transition-colors duration-200"
          >
            <LayoutGrid className="size-5" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}
