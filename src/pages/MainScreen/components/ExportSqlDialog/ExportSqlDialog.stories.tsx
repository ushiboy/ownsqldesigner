import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LocaleProvider } from "../../../../i18n/LocaleProvider";
import { ExportSqlDialog } from "./ExportSqlDialog";

const SAMPLE_DDL =
  "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n  email TEXT NOT NULL\n);";

const SAMPLE_DDL_WITHOUT_PRIMARY_KEY =
  "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n  email TEXT NOT NULL\n);\n\nCREATE TABLE tags (\n  name TEXT NOT NULL\n);";

const meta = {
  title: "pages/MainScreen/ExportSqlDialog",
  component: ExportSqlDialog,
  args: {
    schemaName: "Blog Schema",
    tablesWithoutPrimaryKey: [],
    onClose: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof ExportSqlDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    ddl: SAMPLE_DDL,
  },
};

export const Empty: Story = {
  args: {
    open: true,
    ddl: "",
  },
};

export const WithWarning: Story = {
  args: {
    open: true,
    ddl: SAMPLE_DDL_WITHOUT_PRIMARY_KEY,
    tablesWithoutPrimaryKey: ["tags"],
  },
};
