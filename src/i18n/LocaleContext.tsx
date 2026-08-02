import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { IntlProvider } from "use-intl";
import en from "./messages/en";
import ja from "./messages/ja";
import { isLocale, type Locale } from "./Locale";
import type { Messages } from "./messages/Messages";

const STORAGE_KEY = "ownsqldesigner:locale";

const MESSAGES: Record<Locale, Messages> = { en, ja };

type LocaleSwitchContextValue = {
  setLocale: (locale: Locale) => void;
};

const LocaleSwitchContext = createContext<LocaleSwitchContextValue | null>(null);

type LocaleProviderProps = {
  /** Non-null only in stories and tests that start with Japanese active. */
  initialLocale?: Locale;
  children: ReactNode;
};

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps) {
  const [locale, setLocale] = useState<Locale>(() => initialLocale ?? readStoredLocale() ?? "en");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const switchValue = useMemo<LocaleSwitchContextValue>(() => ({ setLocale }), []);

  return (
    <LocaleSwitchContext value={switchValue}>
      <IntlProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </IntlProvider>
    </LocaleSwitchContext>
  );
}

/** The setter action; read the current locale itself via use-intl's own `useLocale()`. */
export function useLocaleSwitch(): LocaleSwitchContextValue {
  const value = useContext(LocaleSwitchContext);
  if (value === null) {
    throw new Error("useLocaleSwitch must be used within a LocaleProvider");
  }
  return value;
}

function readStoredLocale(): Locale | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : null;
}
