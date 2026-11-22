"use client";

import { cx } from "@/lib/utils/cx";
import { getStatusDefinition } from "@/lib/status/status-config";
import { useLocale } from "@/i18n/LocaleProvider";
import type { StatusContext } from "@/lib/status/status-types";

const DOTS = { success: "bg-success", danger: "bg-danger", warning: "bg-warning", info: "bg-info", neutral: "bg-muted" } as const;

export function StatusIndicator({ status, context, className }: { status: string | null | undefined; context?: StatusContext; className?: string }) {
  const { t } = useLocale();
  const definition = getStatusDefinition(status, context);
  return <span className={cx("inline-flex items-center gap-2 text-xs font-medium text-ink", className)}><span aria-hidden="true" className={cx("size-2 rounded-full", DOTS[definition.tone])} />{t(definition.label)}</span>;
}
