import {
  defaultColumnTemplatesSettingsSchema,
  EMPTY_DEFAULT_COLUMN_TEMPLATES_SETTINGS,
  type DefaultColumnTemplatesSettings,
} from "../../domain/schema";
import { usePersistedState } from "./usePersistedState";

const STORAGE_KEY = "ownsqldesigner:defaultColumnTemplates";

export function useDefaultColumnTemplates(initial?: DefaultColumnTemplatesSettings): {
  defaultColumnTemplates: DefaultColumnTemplatesSettings;
  setDefaultColumnTemplates: (settings: DefaultColumnTemplatesSettings) => void;
} {
  const [defaultColumnTemplates, setDefaultColumnTemplates] = usePersistedState(
    STORAGE_KEY,
    EMPTY_DEFAULT_COLUMN_TEMPLATES_SETTINGS,
    initial,
    { parse: parseDefaultColumnTemplatesSettings, serialize: JSON.stringify },
  );

  return { defaultColumnTemplates, setDefaultColumnTemplates };
}

function parseDefaultColumnTemplatesSettings(raw: string): DefaultColumnTemplatesSettings | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = defaultColumnTemplatesSettingsSchema.safeParse(json);
  return result.success ? result.data : null;
}
