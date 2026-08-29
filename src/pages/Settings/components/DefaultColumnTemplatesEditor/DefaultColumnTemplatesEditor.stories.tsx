import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import type { DefaultColumnTemplatesSettings } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { DefaultColumnTemplatesEditor } from "./DefaultColumnTemplatesEditor";

const idColumn = {
  id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  name: "id",
  type: "INTEGER",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: true,
  comment: "",
  keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
} as const;

const createdAtColumn = {
  id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  name: "created_at",
  type: "TEXT",
  size: "",
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
  keyMembership: { PRIMARY_KEY: false, UNIQUE: false, INDEX: false },
} as const;

const withColumns: DefaultColumnTemplatesSettings = {
  sqlite: [idColumn, createdAtColumn],
};

// Stateful wrapper so interacting in Storybook shows the editor actually
// updating, while `onChange` args stay a `fn()` spy for tests to assert on.
function StatefulDefaultColumnTemplatesEditor({
  settings: initialSettings,
  onChange,
}: {
  settings: DefaultColumnTemplatesSettings;
  onChange: (settings: DefaultColumnTemplatesSettings) => void;
}) {
  const [settings, setSettings] = useState(initialSettings);
  return (
    <DefaultColumnTemplatesEditor
      settings={settings}
      onChange={(next) => {
        setSettings(next);
        onChange(next);
      }}
    />
  );
}

const meta = {
  title: "pages/Settings/DefaultColumnTemplatesEditor",
  component: StatefulDefaultColumnTemplatesEditor,
  args: {
    settings: {},
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof StatefulDefaultColumnTemplatesEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithColumns: Story = {
  args: {
    settings: withColumns,
  },
};
