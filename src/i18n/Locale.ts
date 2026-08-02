export type Locale = "en" | "ja";

export const LOCALES: Locale[] = ["en", "ja"];

// Each language's own name, in that language — shown as-is regardless of the
// active UI locale, same convention as every native language switcher.
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
};

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "ja";
}
