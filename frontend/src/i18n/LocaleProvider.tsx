"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOCALE, isLocale, LANGUAGE_STORAGE_KEY, translate, type Locale } from "./index";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLocale(stored)) updateLocale(stored);
    } catch {
      // Browser storage may be disabled; English remains available.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle("font-khmer", locale === "km");
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch {}
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);
  const context = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={context}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
