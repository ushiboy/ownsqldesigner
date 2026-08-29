import { useDefaultColumnTemplates } from "../../components/hooks/useDefaultColumnTemplates";
import { useFkNamingPattern } from "../../components/hooks/useFkNamingPattern";
import type { DefaultColumnTemplatesSettings, FkNamingPattern } from "../../domain/schema";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { SettingsView } from "./SettingsView";

/** Page state a story or test can start from; all unset in the app. */
export type SettingsSeed = {
  initialFkNamingPattern?: FkNamingPattern;
  initialDefaultColumnTemplates?: DefaultColumnTemplatesSettings;
};

function Settings({ initialFkNamingPattern, initialDefaultColumnTemplates }: SettingsSeed) {
  return (
    <LocaleProvider>
      <SettingsContent
        initialFkNamingPattern={initialFkNamingPattern}
        initialDefaultColumnTemplates={initialDefaultColumnTemplates}
      />
    </LocaleProvider>
  );
}

export default Settings;

function SettingsContent({ initialFkNamingPattern, initialDefaultColumnTemplates }: SettingsSeed) {
  const { fkNamingPattern, setFkNamingPattern } = useFkNamingPattern(initialFkNamingPattern);
  const { defaultColumnTemplates, setDefaultColumnTemplates } = useDefaultColumnTemplates(
    initialDefaultColumnTemplates,
  );

  return (
    <SettingsView
      fkNamingPattern={fkNamingPattern}
      onChangeFkNamingPattern={setFkNamingPattern}
      defaultColumnTemplates={defaultColumnTemplates}
      onChangeDefaultColumnTemplates={setDefaultColumnTemplates}
    />
  );
}
