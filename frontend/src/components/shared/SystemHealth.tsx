"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, CircleHelp, TriangleAlert, WifiOff } from "lucide-react";
import { useSystemHealth, type ConnectionCheckState, type SystemHealthState } from "@/hooks/use-backend-status";
import { useLocale } from "@/i18n/LocaleProvider";

const STATUS_COPY: Record<SystemHealthState, string> = {
  checking: "កំពុងពិនិត្យសុខភាពប្រព័ន្ធ",
  healthy: "ប្រព័ន្ធដំណើរការធម្មតា",
  degraded: "ប្រព័ន្ធមានបញ្ហាខ្លះ",
  offline: "ប្រព័ន្ធមិនអាចភ្ជាប់បាន",
};

const CHECK_COPY: Record<ConnectionCheckState, string> = {
  checking: "កំពុងពិនិត្យ",
  connected: "បានភ្ជាប់",
  unavailable: "មិនអាចប្រើបាន",
  unknown: "មិនមានទិន្នន័យ",
};

const STATUS_STYLE: Record<SystemHealthState, { icon: string; focus: string }> = {
  checking: { icon: "text-amber-500", focus: "focus-visible:ring-amber-500" },
  healthy: { icon: "text-emerald-500", focus: "focus-visible:ring-emerald-500" },
  degraded: { icon: "text-amber-500", focus: "focus-visible:ring-amber-500" },
  offline: { icon: "text-red-500", focus: "focus-visible:ring-red-500" },
};

function HealthIcon({ status }: { status: SystemHealthState }) {
  if (status === "healthy") return <Activity aria-hidden="true" className="size-[18px]" />;
  if (status === "offline") return <WifiOff aria-hidden="true" className="size-[18px]" />;
  return <TriangleAlert aria-hidden="true" className="size-[18px]" />;
}

export function SystemHealth() {
  const { t } = useLocale();
  const health = useSystemHealth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = t(STATUS_COPY[health.status]);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="group relative flex shrink-0 items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${t("System health")}: ${label}`}
        aria-describedby="system-health-tooltip"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((value) => !value)}
        className={`flex size-9 cursor-pointer items-center justify-center rounded-control border border-hairline bg-card transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${STATUS_STYLE[health.status].focus}`}
      >
        <span className={STATUS_STYLE[health.status].icon}>
          <HealthIcon status={health.status} />
        </span>
      </button>

      <span id="system-health-tooltip" role="tooltip" className="pointer-events-none absolute top-full right-0 z-50 mt-2 hidden whitespace-nowrap rounded-control border border-hairline bg-card px-2.5 py-1.5 text-xs font-medium text-ink shadow-lift group-hover:block group-focus-within:block">
        {label}
      </span>

      {open && (
        <div role="dialog" aria-label={t("System health details")} className="absolute top-full right-0 z-[60] mt-2 w-60 rounded-panel border border-hairline bg-card p-3 shadow-lift">
          <div className="mb-2.5 flex items-center gap-2 border-b border-hairline pb-2.5">
            <span className={STATUS_STYLE[health.status].icon}><HealthIcon status={health.status} /></span>
            <div>
              <p className="text-sm font-semibold text-ink">{t("System health")}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
          <CheckRow label={t("API")} status={health.api} t={t} />
          <CheckRow label={t("Database")} status={health.database} t={t} />
        </div>
      )}
    </div>
  );
}

function CheckRow({ label, status, t }: { label: string; status: ConnectionCheckState; t: (key: string) => string }) {
  const good = status === "connected";
  const bad = status === "unavailable";
  const Icon = good ? CheckCircle2 : bad ? WifiOff : CircleHelp;
  const tone = good ? "text-emerald-500" : bad ? "text-red-500" : "text-amber-500";

  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs">
      <span className="font-medium text-muted">{label}</span>
      <span className={`inline-flex items-center gap-1.5 font-semibold ${tone}`}>
        <Icon aria-hidden="true" className="size-3.5" />
        {t(CHECK_COPY[status])}
      </span>
    </div>
  );
}
