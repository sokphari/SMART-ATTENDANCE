"use client";

import { useLocale } from "@/i18n/LocaleProvider";

export type StatusOption = { value: string; label?: string };

export function StatusSelect({ value, options, onChange, label, disabled = false, includeAll = false, className = "" }: { value: string; options: StatusOption[]; onChange: (value: string) => void; label: string; disabled?: boolean; includeAll?: boolean; className?: string }) {
  const { t } = useLocale();
  return <select aria-label={t(label)} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`h-10 rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 ${className}`}>
    {includeAll && <option value="">{t("All statuses")}</option>}
    {options.map((option) => <option key={option.value} value={option.value}>{t(option.label ?? option.value.replaceAll("_", " "))}</option>)}
  </select>;
}
