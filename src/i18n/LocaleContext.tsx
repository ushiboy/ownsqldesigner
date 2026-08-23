import { type ReactNode, createContext, useContext, useMemo } from "react";
import { IntlProvider } from "use-intl";
import { usePersistedState } from "../components/hooks/usePersistedState";
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
  const [locale, setLocale] = usePersistedState(STORAGE_KEY, "en", initialLocale, {
    parse: parseLocale,
  });

  const switchValue = useMemo<LocaleSwitchContextValue>(() => ({ setLocale }), [setLocale]);

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

function parseLocale(raw: string): Locale | null {
  return isLocale(raw) ? raw : null;
}
