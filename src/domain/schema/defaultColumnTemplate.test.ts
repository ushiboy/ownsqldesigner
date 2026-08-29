import { EMPTY_COLUMN_KEY_MEMBERSHIP } from "./key";
import {
  defaultColumnTemplatesSettingsSchema,
  getDefaultColumnTemplateKeyMembershipDisabled,
  getDefaultColumnTemplatesForDialect,
  type DefaultColumnTemplate,
} from "./defaultColumnTemplate";

const idTemplate: DefaultColumnTemplate = {
  id: "c3a1e96a-9a75-4d3c-b0ad-3d6e1b6a5f01",
  name: "id",
  type: "INTEGER",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: true,
  comment: "",
  keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
};

const createdAtTemplate: DefaultColumnTemplate = {
  id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  name: "created_at",
  type: "TEXT",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
  keyMembership: EMPTY_COLUMN_KEY_MEMBERSHIP,
};

describe("getDefaultColumnTemplatesForDialect", () => {
  it("returns the configured templates for the dialect", () => {
    const settings = { sqlite: [idTemplate] };

    expect(getDefaultColumnTemplatesForDialect(settings, "sqlite")).toEqual([idTemplate]);
  });

  it("returns an empty list for a dialect with no configured templates", () => {
    const settings = { sqlite: [idTemplate] };

    expect(getDefaultColumnTemplatesForDialect(settings, "postgresql")).toEqual([]);
  });

  it("returns an empty list for an empty settings object", () => {
    expect(getDefaultColumnTemplatesForDialect({}, "sqlite")).toEqual([]);
  });
});

describe("getDefaultColumnTemplateKeyMembershipDisabled", () => {
  it("disables PRIMARY_KEY when another row already owns it", () => {
    const disabled = getDefaultColumnTemplateKeyMembershipDisabled(
      [idTemplate, createdAtTemplate],
      createdAtTemplate.id,
    );

    expect(disabled).toEqual({
      PRIMARY_KEY: "CONFLICTING_PRIMARY_KEY",
      UNIQUE: null,
      INDEX: null,
    });
  });

  it("does not disable PRIMARY_KEY for the row that already owns it", () => {
    const disabled = getDefaultColumnTemplateKeyMembershipDisabled(
      [idTemplate, createdAtTemplate],
      idTemplate.id,
    );

    expect(disabled.PRIMARY_KEY).toBeNull();
  });

  it("does not disable anything when no row owns PRIMARY_KEY", () => {
    const disabled = getDefaultColumnTemplateKeyMembershipDisabled([createdAtTemplate], null);

    expect(disabled).toEqual({ PRIMARY_KEY: null, UNIQUE: null, INDEX: null });
  });
});

describe("defaultColumnTemplatesSettingsSchema", () => {
  it("accepts a settings object missing some dialects", () => {
    const result = defaultColumnTemplatesSettingsSchema.safeParse({ sqlite: [idTemplate] });

    expect(result.success).toBe(true);
  });

  it("accepts an unrecognized dialect key without failing validation", () => {
    // Forward-compatible with a settings value saved by a future build that
    // supports a dialect this build doesn't know about yet.
    const result = defaultColumnTemplatesSettingsSchema.safeParse({ mysql: [idTemplate] });

    expect(result.success).toBe(true);
  });

  it("rejects a template row missing required fields", () => {
    const result = defaultColumnTemplatesSettingsSchema.safeParse({
      sqlite: [{ id: idTemplate.id, name: "" }],
    });

    expect(result.success).toBe(false);
  });
});
