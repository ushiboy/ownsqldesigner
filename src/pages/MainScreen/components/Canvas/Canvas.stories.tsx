import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Table } from "../../../../domain/schema";
import { Canvas } from "./Canvas";

const tables: Table[] = [
  {
    id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    name: "users",
    comment: "Registered users",
    position: { x: 0, y: 0 },
    columns: [],
    keys: [],
    foreignKeys: [],
  },
  {
    id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
    name: "posts",
    comment: "",
    position: { x: 260, y: 0 },
    columns: [],
    keys: [],
    foreignKeys: [],
  },
];

const tablesWithRelation: Table[] = [
  {
    id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    name: "users",
    comment: "",
    position: { x: 0, y: 0 },
    columns: [
      {
        id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
        name: "id",
        type: "INTEGER",
        size: "",
        defaultValue: "",
        nullable: false,
        autoIncrement: true,
        comment: "",
      },
    ],
    keys: [
      {
        id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
        type: "PRIMARY_KEY",
        columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
      },
    ],
    foreignKeys: [],
  },
  {
    id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
    name: "posts",
    comment: "",
    position: { x: 300, y: 200 },
    columns: [
      {
        id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
        name: "user_id",
        type: "INTEGER",
        size: "",
        defaultValue: "",
        nullable: false,
        autoIncrement: false,
        comment: "",
      },
    ],
    keys: [],
    foreignKeys: [
      {
        id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        columnId: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
        referencedTableId: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
        referencedColumnId: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      },
    ],
  },
];

const meta = {
  title: "pages/MainScreen/Canvas",
  component: Canvas,
  args: {
    tables: [],
    selectedTableIds: new Set(),
    selectedRelationId: null,
    onTableSelectionChange: fn(),
    onSelectRelation: fn(),
    onMoveTables: fn(),
    onAddForeignKey: fn(),
    onAddForeignKeyWithNewColumn: fn(),
  },
  decorators: [
    (Story) => (
      <div className="h-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTables: Story = {
  args: { tables },
};

export const Selected: Story = {
  args: { tables, selectedTableIds: new Set(tables[0] === undefined ? [] : [tables[0].id]) },
};

export const MultiSelected: Story = {
  args: { tables, selectedTableIds: new Set(tables.map((table) => table.id)) },
};

export const WithRelation: Story = {
  args: { tables: tablesWithRelation },
};

export const RelationSelected: Story = {
  args: {
    tables: tablesWithRelation,
    selectedRelationId: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  },
};
