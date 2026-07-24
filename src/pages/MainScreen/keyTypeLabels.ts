import type { KeyType } from "../../domain/schema";

export const KEY_TYPE_LABELS: Record<KeyType, string> = {
  PRIMARY_KEY: "PRIMARY KEY",
  UNIQUE: "UNIQUE",
  INDEX: "INDEX",
};
