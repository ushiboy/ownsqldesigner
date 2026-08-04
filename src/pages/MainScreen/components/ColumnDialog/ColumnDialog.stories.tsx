import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DEFAULT_SQL_DIALECT } from "../../../../domain/dialect";
import type { Column, ColumnKeyMembership } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { ColumnDialog } from "./ColumnDialog";

const NO_KEY_MEMBERSHIP: ColumnKeyMembership = { PRIMARY_KEY: false, UNIQUE: false, INDEX: false };

const column: Column = {
  id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  name: "title",
  type: "TEXT",
  size: "",
  defaultValue: "",
  nullable: true,
  autoIncrement: false,
  comment: "",
};

const primaryKeyColumn: Column = {
  id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
  name: "id",
  type: "INTEGER",
  size: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
};

const meta = {
  title: "pages/MainScreen/ColumnDialog",
  component: ColumnDialog,
  args: {
    dialect: DEFAULT_SQL_DIALECT,
    existingNames: [],
    keyMembership: NO_KEY_MEMBERSHIP,
    keyMembershipDisabled: NO_KEY_MEMBERSHIP,
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof ColumnDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {
  args: {
    open: true,
    title: "Add Column",
    submitLabel: "Add",
  },
};

export const Edit: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: column,
  },
};

export const EditAllowsAutoIncrement: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: primaryKeyColumn,
    keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
};

export const AddPrimaryKeyDisabled: Story = {
  args: {
    open: true,
    title: "Add Column",
    submitLabel: "Add",
    keyMembershipDisabled: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
};

export const DuplicateName: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: column,
    existingNames: ["title", "body"],
  },
};

export const InvalidName: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: { ...column, name: "1title" },
  },
};
