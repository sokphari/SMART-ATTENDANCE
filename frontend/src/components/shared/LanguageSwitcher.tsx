"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import { languageNames, type Locale } from "@/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <label className="flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-hairline bg-card px-2 text-xs font-semibold text-muted">
      <Languages aria-hidden="true" className="size-4" />
      {!compact && <span className="hidden xl:inline">{t("Language")}</span>}
      <select
        aria-label={t("Choose language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="min-w-0 max-w-20 cursor-pointer bg-transparent text-ink outline-none"
      >
        <option value="en">{languageNames.en}</option>
        <option value="km">{languageNames.km}</option>
      </select>
    </label>
  );
}
