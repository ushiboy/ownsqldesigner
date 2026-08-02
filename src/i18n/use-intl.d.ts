import type { Locale } from "./Locale";
import type { Messages } from "./messages/Messages";

declare module "use-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
