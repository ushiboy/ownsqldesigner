import type { Meta, StoryObj } from "@storybook/react-vite";
// storybook/test's userEvent (not the standalone @testing-library/user-event
// package): its default click also crashes React Flow's d3-zoom pane, which
// reads `event.view` from the dispatched mouse event and gets null from the
// standalone package.
import { fn, userEvent, within } from "storybook/test";
import type { Table } from "../../../../domain/schema";
import { CanvasApiProvider } from "../../CanvasApiContext";
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
    selectedRelationId: null,
    onTableSelectionChange: fn(),
    onSelectRelation: fn(),
    onMoveTables: fn(),
    onAddForeignKey: fn(),
    onAddForeignKeyWithNewColumn: fn(),
  },
  decorators: [
    (Story) => (
      <CanvasApiProvider>
        <div className="h-[400px]">
          <Story />
        </div>
      </CanvasApiProvider>
    ),
  ],
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTables: Story = {
  args: { tables },
};

// Selection is React Flow's own internal state (see
// docs/design/0016-undo-redo.md), so there's no prop to seed it with — the
// play function drives a real click/shift-click to reach the state.
export const Selected: Story = {
  args: { tables },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Table users" }));
  },
};

export const MultiSelected: Story = {
  args: { tables },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Shares one session across the press/click/release so the modifier
    // state is tracked consistently, and releases Shift in `finally` so a
    // failed click can't leak a held key into a later test.
    const user = userEvent.setup();
    await user.click(await canvas.findByRole("button", { name: "Table users" }));
    await user.keyboard("{Shift>}");
    try {
      await user.click(canvas.getByRole("button", { name: "Table posts" }));
    } finally {
      await user.keyboard("{/Shift}");
    }
  },
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
