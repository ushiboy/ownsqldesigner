import { Link } from "react-router";
import { useTranslations } from "use-intl";
import type { DefaultColumnTemplatesSettings, FkNamingPattern } from "../../domain/schema";
import { DefaultColumnTemplatesEditor } from "./components/DefaultColumnTemplatesEditor";
import { RadioOption } from "./components/RadioOption";

type SettingsViewProps = {
  fkNamingPattern: FkNamingPattern;
  onChangeFkNamingPattern: (pattern: FkNamingPattern) => void;
  defaultColumnTemplates: DefaultColumnTemplatesSettings;
  onChangeDefaultColumnTemplates: (settings: DefaultColumnTemplatesSettings) => void;
};

export function SettingsView({
  fkNamingPattern,
  onChangeFkNamingPattern,
  defaultColumnTemplates,
  onChangeDefaultColumnTemplates,
}: SettingsViewProps) {
  const t = useTranslations("settings");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-[14px] text-accent hover:underline">
        {t("backLinkLabel")}
      </Link>
      <h1 className="mt-4 text-[20px] text-heading">{t("heading")}</h1>
      <section className="mt-8">
        <h2 className="text-[16px] text-heading">{t("foreignKeysCategoryHeading")}</h2>
        <fieldset className="mt-3 flex flex-col gap-2">
          <legend className="mb-2 text-[14px] text-body">{t("namingPatternLegend")}</legend>
          <RadioOption
            name="fkNamingPattern"
            label={t("namingPatternTableColumnLabel")}
            description={t("namingPatternTableColumnExample")}
            checked={fkNamingPattern === "tableColumn"}
            onChange={() => onChangeFkNamingPattern("tableColumn")}
          />
          <RadioOption
            name="fkNamingPattern"
            label={t("namingPatternTableIdLabel")}
            description={t("namingPatternTableIdExample")}
            checked={fkNamingPattern === "tableId"}
            onChange={() => onChangeFkNamingPattern("tableId")}
          />
        </fieldset>
      </section>
      <section className="mt-8">
        <h2 className="text-[16px] text-heading">{t("defaultColumnsCategoryHeading")}</h2>
        <div className="mt-3">
          <DefaultColumnTemplatesEditor
            settings={defaultColumnTemplates}
            onChange={onChangeDefaultColumnTemplates}
          />
        </div>
      </section>
    </div>
  );
}
