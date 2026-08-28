import { LuCheck } from "react-icons/lu";
import { useTranslations } from "use-intl";
import { useEscapeKey } from "../../../../components/hooks/useEscapeKey";
import { useMenuRovingFocus } from "../../../../components/hooks/useMenuRovingFocus";
import { LOCALE_LABELS, LOCALES, type Locale } from "../../../../i18n/Locale";
import { menuBox, menuItem } from "./dropdownMenu";

type LocaleMenuProps = {
  currentLocale: Locale;
  onSelectLocale: (locale: Locale) => void;
  onClose: () => void;
};

export function LocaleMenu({ currentLocale, onSelectLocale, onClose }: LocaleMenuProps) {
  const t = useTranslations("localeMenu");

  useEscapeKey(onClose);
  const { getItemTabIndex, registerItemRef, onMenuKeyDown } = useMenuRovingFocus({
    itemCount: LOCALES.length,
    initialIndex: LOCALES.indexOf(currentLocale),
    onClose,
  });

  return (
    <div
      role="menu"
      aria-label={t("ariaLabel")}
      tabIndex={-1}
      onKeyDown={onMenuKeyDown}
      className={menuBox()}
    >
      {LOCALES.map((locale, index) => {
        const isCurrent = locale === currentLocale;
        return (
          <button
            key={locale}
            type="button"
            role="menuitem"
            aria-current={isCurrent || undefined}
            ref={registerItemRef(index)}
            tabIndex={getItemTabIndex(index)}
            onClick={() => {
              onClose();
              onSelectLocale(locale);
            }}
            className={menuItem()}
          >
            {isCurrent ? (
              <LuCheck aria-hidden="true" className="size-4 shrink-0 text-accent" />
            ) : (
              <span aria-hidden="true" className="size-4 shrink-0" />
            )}
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
