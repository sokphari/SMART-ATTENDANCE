"use client";

import { BadgeCheck, Ban, CalendarClock, CircleHelp, Clock3, Info, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { cx } from "@/lib/utils/cx";
import { getStatusDefinition } from "@/lib/status/status-config";
import type { StatusContext } from "@/lib/status/status-types";
import { useLocale } from "@/i18n/LocaleProvider";

const ICONS = {
  check: BadgeCheck,
  close: XCircle,
  clock: Clock3,
  info: Info,
  pause: PauseCircle,
  play: PlayCircle,
  calendar: CalendarClock,
} as const;

const TONES = {
  success: "bg-success-soft text-success ring-success/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  info: "bg-info-soft text-info ring-info/20",
  neutral: "bg-canvas text-muted ring-hairline",
} as const;

export function StatusBadge({ status, context, className, icon = true }: { status: string | null | undefined; context?: StatusContext; className?: string; icon?: boolean }) {
  const { t } = useLocale();
  const definition = getStatusDefinition(status, context);
  const Icon = ICONS[definition.icon] ?? CircleHelp;
  return (
    <span aria-label={`${t("Status")}: ${t(definition.label)}`} className={cx("inline-flex min-h-6 items-center gap-1.5 rounded-control px-2 py-0.5 text-[11px] font-semibold leading-tight ring-1 ring-inset", TONES[definition.tone], className)}>
      {icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      {t(definition.label)}
    </span>
  );
}
