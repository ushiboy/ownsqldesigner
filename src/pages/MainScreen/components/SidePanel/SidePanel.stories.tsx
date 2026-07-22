import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Table } from "../../../../domain/schema";
import { SidePanel } from "./SidePanel";

const table: Table = {
  id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  name: "users",
  comment: "Registered users",
  position: { x: 0, y: 0 },
  columns: [],
};

const tableWithColumns: Table = {
  ...table,
  columns: [
    {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      name: "id",
      type: "INTEGER",
      size: "",
      defaultValue: "",
      nullable: false,
      comment: "",
    },
    {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      name: "email",
      type: "TEXT",
      size: "",
      defaultValue: "",
      nullable: false,
      comment: "",
    },
  ],
};

const meta = {
  title: "pages/MainScreen/SidePanel",
  component: SidePanel,
  args: {
    isOpen: true,
    schemaName: "Blog Schema",
    tableCount: 0,
    createdDate: "2026-07-01",
    selectedTable: null,
    onUpdateTableName: fn(),
    onUpdateTableComment: fn(),
    onAddColumn: fn(),
    onEditColumn: fn(),
    onDeleteColumn: fn(),
  },
  decorators: [
    (Story) => (
      <div className="flex h-96 justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TableSelected: Story = {
  args: {
    tableCount: 1,
    selectedTable: table,
  },
};

export const TableWithColumns: Story = {
  args: {
    tableCount: 1,
    selectedTable: tableWithColumns,
  },
};
