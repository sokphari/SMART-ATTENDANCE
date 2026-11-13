"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Info,
  LogIn,
  LogOut,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type {
  NotificationCategory,
  NotificationItem,
  NotificationResponse,
} from "@/types/notification";

const LOCAL_STORAGE_READ_KEY = "smart_attendance_last_read_notif";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [category, setCategory] = useState<NotificationCategory>("all");
  const [lastReadTime, setLastReadTime] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, mutate } = useSWR<NotificationResponse>(
    "/api/v1/notifications?limit=30",
    () => apiFetch<NotificationResponse>("/api/v1/notifications?limit=30"),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  );

  // Initialize last read time from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LOCAL_STORAGE_READ_KEY);
      if (stored) {
        setLastReadTime(stored);
      }
    }
  }, []);

  useEffect(() => {
    setNotifications(data?.data ?? []);
  }, [data]);

  const fetchNotifications = async () => {
    await mutate();
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Calculate unread count based on lastReadTime
  const unreadCount = notifications.filter((item) => {
    if (!lastReadTime) return true;
    return new Date(item.created_at) > new Date(lastReadTime);
  }).length;

  const markAllAsRead = () => {
    const nowIso = new Date().toISOString();
    setLastReadTime(nowIso);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_READ_KEY, nowIso);
    }
  };

  const handleToggle = () => {
    if (!open && unreadCount > 0) {
      // Automatically mark read when opened or user can click mark all read
    }
    setOpen((prev) => !prev);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (category === "all") return true;
    if (category === "auth") return n.category === "auth";
    if (category === "attendance") return n.category === "attendance";
    return n.category === "system";
  });

  // Determine if there is any critical alert in unread items (e.g. failed login or throttled)
  const hasUnreadAlert = notifications.some(
    (n) =>
      (!lastReadTime || new Date(n.created_at) > new Date(lastReadTime)) &&
      (n.level === "error" || n.level === "warning"),
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        title="Alerts and login notifications"
        className={`relative flex size-9 cursor-pointer items-center justify-center rounded-control border border-hairline bg-card text-slate-500 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700 ${
          open ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500/30" : ""
        }`}
      >
        <Bell className="size-4" />

        {/* Unread badge & ping */}
        {unreadCount > 0 && (
          <>
            {hasUnreadAlert && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 animate-ping rounded-full bg-rose-500 opacity-75" />
            )}
            <span
              className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-card ${
                hasUnreadAlert ? "bg-rose-600" : "bg-brand-600"
              }`}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          role="region"
          aria-label="Notification center"
          className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-hairline bg-card/95 p-0 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Bell className="size-4" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Notifications
                </h3>
                <p className="text-[11px] text-slate-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                    : "All caught up"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchNotifications}
                title="Refresh notifications"
                className="flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <RotateCw
                  className={`size-3.5 ${isLoading ? "animate-spin text-brand-600" : ""}`}
                />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40 transition-colors"
                >
                  <CheckCheck className="size-3.5" />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* Filter Categories */}
          <div className="flex items-center gap-1 border-b border-hairline px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/40 text-xs">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                category === "all"
                  ? "bg-brand-500 text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCategory("auth")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                category === "auth"
                  ? "bg-brand-500 text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
              }`}
            >
              Sign-ins & Security
            </button>
            <button
              type="button"
              onClick={() => setCategory("attendance")}
              className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
                category === "attendance"
                  ? "bg-brand-500 text-white shadow-xs font-semibold"
                  : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800"
              }`}
            >
              Attendance
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 mb-2">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No notifications to show
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                  Sign-in activity, failed login alerts, and attendance events
                  will appear here in real-time.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUnread =
                  !lastReadTime ||
                  new Date(notif.created_at) > new Date(lastReadTime);

                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 p-3 transition-colors ${
                      isUnread
                        ? "bg-brand-50/40 dark:bg-brand-950/20"
                        : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Status Icon */}
                    <div className="shrink-0 mt-0.5">
                      {notif.level === "success" && (
                        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {notif.action.includes("login") ? (
                            <LogIn className="size-4" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                        </span>
                      )}
                      {notif.level === "error" && (
                        <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          {notif.action.includes("login") ? (
                            <ShieldAlert className="size-4" />
                          ) : (
                            <AlertTriangle className="size-4" />
                          )}
                        </span>
                      )}
                      {notif.level === "warning" && (
                        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="size-4" />
                        </span>
                      )}
                      {notif.level === "info" && (
                        <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          {notif.action.includes("logout") ? (
                            <LogOut className="size-4" />
                          ) : (
                            <Info className="size-4" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span className="size-1.5 rounded-full bg-brand-500 shrink-0" />
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-snug break-words">
                        {notif.message}
                      </p>

                      {/* Meta footer */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(notif.created_at)}</span>
                        {notif.ip_address && (
                          <span className="rounded-sm bg-slate-100 dark:bg-slate-800 px-1 py-0.2 font-mono text-[9px] text-slate-500">
                            IP: {notif.ip_address}
                          </span>
                        )}
                        {notif.metadata?.role && (
                          <span className="rounded-sm bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 px-1 py-0.2 font-medium capitalize">
                            {notif.metadata.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-hairline p-2 text-center bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl">
            <Link
              href="/audit-logs"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              <span>View full audit log stream</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 5) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
