"use client";

import { cx } from "@/lib/utils/cx";
import { useLocale } from "@/i18n/LocaleProvider";
import type { RefObject } from "react";

type StatusSwitchProps = {
  checked: boolean;
  onToggle: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
  accessibleLabel: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
};

export function StatusSwitch({ checked, onToggle, activeLabel = "Active", inactiveLabel = "Inactive", accessibleLabel, disabled = false, loading = false, className, triggerRef }: StatusSwitchProps) {
  const { t } = useLocale();
  return (
    <button
      ref={triggerRef}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${accessibleLabel}: ${t(checked ? activeLabel : inactiveLabel)}`}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={onToggle}
      className={cx("inline-flex min-h-9 touch-manipulation items-center gap-2.5 rounded-control text-left text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      <span aria-hidden="true" className={cx("relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full p-[3px] transition-colors duration-200", checked ? "bg-success" : "bg-hairline")}>
        <span className={cx("size-4 rounded-full bg-white shadow-sm transition-transform duration-200", checked ? "translate-x-[18px]" : "translate-x-0")} />
      </span>
      <span className="whitespace-nowrap">{t(checked ? activeLabel : inactiveLabel)}</span>
      {loading && <span className="sr-only">{t("Updating status")}</span>}
    </button>
  );
}
