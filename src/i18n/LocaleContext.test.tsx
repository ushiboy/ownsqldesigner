import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "use-intl";
import { LocaleProvider, useLocaleSwitch } from "./LocaleContext";

const STORAGE_KEY = "ownsqldesigner:locale";

const wrapper = ({ children }: { children: ReactNode }) => (
  <LocaleProvider>{children}</LocaleProvider>
);

function useLocaleFixture() {
  return { locale: useLocale(), t: useTranslations("common"), ...useLocaleSwitch() };
}

describe("LocaleProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to English when nothing is stored", () => {
    const { result } = renderHook(() => useLocaleFixture(), { wrapper });

    expect(result.current.locale).toBe("en");
    expect(result.current.t("cancel")).toBe("Cancel");
  });

  it("restores a previously stored locale", () => {
    localStorage.setItem(STORAGE_KEY, "ja");
    const { result } = renderHook(() => useLocaleFixture(), { wrapper });

    expect(result.current.locale).toBe("ja");
    expect(result.current.t("cancel")).toBe("キャンセル");
  });

  it("falls back to English when the stored value is invalid", () => {
    localStorage.setItem(STORAGE_KEY, "fr");
    const { result } = renderHook(() => useLocaleFixture(), { wrapper });

    expect(result.current.locale).toBe("en");
  });

  it("uses initialLocale to seed state, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "ja");
    const { result } = renderHook(() => useLocaleFixture(), {
      wrapper: ({ children }) => <LocaleProvider initialLocale="en">{children}</LocaleProvider>,
    });

    expect(result.current.locale).toBe("en");
  });

  it("persists the locale to storage on change", () => {
    const { result } = renderHook(() => useLocaleFixture(), { wrapper });

    act(() => result.current.setLocale("ja"));

    expect(localStorage.getItem(STORAGE_KEY)).toBe("ja");
  });

  it("switches to the selected locale", () => {
    const { result } = renderHook(() => useLocaleFixture(), { wrapper });

    act(() => result.current.setLocale("ja"));
    expect(result.current.locale).toBe("ja");

    act(() => result.current.setLocale("en"));
    expect(result.current.locale).toBe("en");
  });

  it("throws when useLocaleSwitch is used outside a provider", () => {
    expect(() => renderHook(() => useLocaleSwitch())).toThrow(
      "useLocaleSwitch must be used within a LocaleProvider",
    );
  });
});
