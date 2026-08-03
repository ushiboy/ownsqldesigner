import { useFkNamingPattern } from "../../components/hooks/useFkNamingPattern";
import type { FkNamingPattern } from "../../domain/schema";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { SettingsView } from "./SettingsView";

/** Page state a story or test can start from; all unset in the app. */
export type SettingsSeed = {
  initialFkNamingPattern?: FkNamingPattern;
};

function Settings({ initialFkNamingPattern }: SettingsSeed) {
  return (
    <LocaleProvider>
      <SettingsContent initialFkNamingPattern={initialFkNamingPattern} />
    </LocaleProvider>
  );
}

export default Settings;

function SettingsContent({ initialFkNamingPattern }: SettingsSeed) {
  const { fkNamingPattern, setFkNamingPattern } = useFkNamingPattern(initialFkNamingPattern);

  return (
    <SettingsView fkNamingPattern={fkNamingPattern} onChangeFkNamingPattern={setFkNamingPattern} />
  );
}
