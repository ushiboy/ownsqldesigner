import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Table } from "../../../../domain/schema";
import { sqliteDialectStrategy } from "../../../../domain/sqlite/sqliteDialectStrategy";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { SidePanel } from "./SidePanel";

const table: Table = {
  id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  name: "users",
  comment: "Registered users",
  position: { x: 0, y: 0 },
  columns: [],
  keys: [],
  foreignKeys: [],
};

const tableWithColumns: Table = {
  ...table,
  columns: [
    {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      name: "id",
      type: "INTEGER",
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: true,
      comment: "",
    },
    {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      name: "email",
      type: "TEXT",
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: false,
      comment: "",
    },
  ],
};

const tableWithKeys: Table = {
  ...tableWithColumns,
  keys: [
    {
      id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      type: "PRIMARY_KEY",
      columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
    },
    {
      id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      type: "UNIQUE",
      columnIds: ["a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
    },
  ],
};

const relations = [{ id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23", label: "user_id → users.id" }];

const meta = {
  title: "pages/MainScreen/SidePanel",
  component: SidePanel,
  args: {
    isOpen: true,
    schemaName: "Blog Schema",
    tableCount: 0,
    createdDate: "2026-07-01",
    dialect: "sqlite",
    selectedTable: null,
    selectedTableCount: 0,
    strategy: sqliteDialectStrategy,
    existingTableNames: [],
    relations: [],
    onUpdateTableName: fn(),
    onUpdateTableComment: fn(),
    onDeleteTable: fn(),
    onDeleteTables: fn(),
    onAddColumn: fn(),
    onEditColumn: fn(),
    onDeleteColumn: fn(),
    onMoveColumnUp: fn(),
    onMoveColumnDown: fn(),
    onAddKey: fn(),
    onEditKey: fn(),
    onDeleteKey: fn(),
    onDeleteRelation: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <div className="flex h-96 justify-end">
          <Story />
        </div>
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TableSelected: Story = {
  args: {
    tableCount: 1,
    selectedTableCount: 1,
    selectedTable: table,
  },
};

export const TableWithColumns: Story = {
  args: {
    tableCount: 1,
    selectedTableCount: 1,
    selectedTable: tableWithColumns,
  },
};

export const TableWithKeys: Story = {
  args: {
    tableCount: 1,
    selectedTableCount: 1,
    selectedTable: tableWithKeys,
  },
};

export const TableWithRelations: Story = {
  args: {
    tableCount: 1,
    selectedTableCount: 1,
    selectedTable: tableWithKeys,
    relations,
  },
};

export const TableSelectedWithSiblings: Story = {
  args: {
    tableCount: 2,
    selectedTableCount: 1,
    selectedTable: table,
    existingTableNames: ["posts"],
  },
};

export const MultipleTablesSelected: Story = {
  args: {
    tableCount: 3,
    selectedTableCount: 2,
  },
};
