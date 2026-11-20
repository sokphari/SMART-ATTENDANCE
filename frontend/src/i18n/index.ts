import en from "./en.json";
import { khmer } from "./khmer";

export type Locale = "en" | "km";
export const LANGUAGE_STORAGE_KEY = "smart_attendance_locale";
export const DEFAULT_LOCALE: Locale = "en";
export const isLocale = (value: unknown): value is Locale => value === "en" || value === "km";

const english = en as Record<string, string>;
/** Unknown strings deliberately remain in English rather than showing broken keys. */
export function translate(locale: Locale, key: string): string {
  if (locale === "en") return english[key] ?? key;
  return khmer[key] ?? english[key] ?? key;
}
export const languageNames: Record<Locale, string> = { en: "English", km: "ខ្មែរ" };
