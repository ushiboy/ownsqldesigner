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
  },
  {
    id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
    name: "posts",
    comment: "",
    position: { x: 260, y: 0 },
    columns: [],
  },
];

const meta = {
  title: "pages/MainScreen/Canvas",
  component: Canvas,
  args: {
    tables: [],
    selectedTableId: null,
    onSelectTable: fn(),
    onMoveTable: fn(),
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
  args: { tables, selectedTableId: tables[0]?.id ?? null },
};
