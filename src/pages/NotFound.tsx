import { useTranslations } from "use-intl";
import { LocaleProvider } from "@/i18n/LocaleProvider";

function NotFound() {
  return (
    <LocaleProvider>
      <NotFoundContent />
    </LocaleProvider>
  );
}

export default NotFound;

function NotFoundContent() {
  const t = useTranslations("notFound");
  return (
    <section>
      <h1>{t("heading")}</h1>
      <p>{t("body")}</p>
    </section>
  );
}
