import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type {
  Column,
  ColumnKeyMembership,
  ColumnKeyMembershipDisabled,
} from "../../../../domain/schema";
import { postgresqlDialectStrategy } from "../../../../domain/postgresql/postgresqlDialectStrategy";
import { sqliteDialectStrategy } from "../../../../domain/sqlite/sqliteDialectStrategy";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { ColumnDialog } from "./ColumnDialog";

const NO_KEY_MEMBERSHIP: ColumnKeyMembership = { PRIMARY_KEY: false, UNIQUE: false, INDEX: false };
const NO_KEY_MEMBERSHIP_DISABLED: ColumnKeyMembershipDisabled = {
  PRIMARY_KEY: null,
  UNIQUE: null,
  INDEX: null,
};

const column: Column = {
  id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  name: "title",
  type: "TEXT",
  size: "",
  precision: "",
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
  precision: "",
  defaultValue: "",
  nullable: false,
  autoIncrement: false,
  comment: "",
};

const meta = {
  title: "pages/MainScreen/ColumnDialog",
  component: ColumnDialog,
  args: {
    strategy: sqliteDialectStrategy,
    existingNames: [],
    keyMembership: NO_KEY_MEMBERSHIP,
    keyMembershipDisabled: NO_KEY_MEMBERSHIP_DISABLED,
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
    keyMembershipDisabled: { PRIMARY_KEY: "CONFLICTING_PRIMARY_KEY", UNIQUE: null, INDEX: null },
  },
};

export const EditReferencedByForeignKeyDisabled: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: primaryKeyColumn,
    keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
    keyMembershipDisabled: {
      PRIMARY_KEY: "REFERENCED_BY_FOREIGN_KEY",
      UNIQUE: null,
      INDEX: null,
    },
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

export const ReservedName: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    initialColumn: { ...column, name: "select" },
  },
};

export const PostgresqlSizeNotApplicable: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...column, type: "BOOLEAN" },
  },
};

export const PostgresqlSizeApplicable: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...column, type: "VARCHAR", size: "50" },
  },
};

export const PostgresqlPrecisionApplicable: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...column, type: "TIMESTAMP", precision: "3" },
  },
};

export const PostgresqlSizeInvalidFormat: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...column, type: "VARCHAR", size: "abc" },
  },
};

export const PostgresqlPrecisionOutOfRange: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...column, type: "TIMESTAMP", precision: "9" },
  },
};

export const PostgresqlEditAllowsAutoIncrement: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: primaryKeyColumn,
    keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
};

export const PostgresqlDefaultNotApplicableWithAutoIncrement: Story = {
  args: {
    open: true,
    title: "Edit Column",
    submitLabel: "Save",
    strategy: postgresqlDialectStrategy,
    initialColumn: { ...primaryKeyColumn, autoIncrement: true, defaultValue: "1" },
    keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
};
