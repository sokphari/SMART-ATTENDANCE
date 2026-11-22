"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n";

const OPTIONS: Array<{ value: Locale; flag: string; label: string; code: string }> = [
  { value: "en", flag: "🇬🇧", label: "English", code: "EN" },
  { value: "km", flag: "🇰🇭", label: "ខ្មែរ", code: "KH" },
];

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = OPTIONS.findIndex((option) => option.value === locale);
  const selected = OPTIONS[selectedIndex] ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    optionRefs.current[selectedIndex]?.focus();
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup='menu']")?.focus();
      }
    };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % OPTIONS.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = OPTIONS.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
    }
  }

  function chooseLanguage(value: Locale) {
    setLocale(value);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        aria-label={t("Choose language")}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("Language")}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 min-w-[76px] items-center justify-center gap-2 rounded-control border border-hairline bg-card px-2.5 text-xs font-bold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {compact ? <span aria-hidden="true" className="text-sm leading-none">{selected.flag}</span> : <Languages aria-hidden="true" className="size-4 text-muted" />}
        <span>{compact ? selected.code : t("Language")}</span>
        <ChevronDown aria-hidden="true" className={`size-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("Language")}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-panel border border-hairline bg-card p-2 shadow-lift"
        >
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t("Language")}</p>
          {OPTIONS.map((option, index) => {
            const active = option.value === locale;
            return (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                tabIndex={-1}
                onClick={() => chooseLanguage(option.value)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300" : "text-ink hover:bg-canvas"}`}
              >
                <span aria-hidden="true" className="text-xl leading-none">{option.flag}</span>
                <span className="flex-1 text-sm font-semibold">{option.label}</span>
                <span className="text-xs font-bold text-muted">{option.code}</span>
                {active && <Check aria-hidden="true" className="size-4 text-brand-600 dark:text-brand-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
