import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Column } from "../../../../domain/schema";
import { ColumnDialog } from "./ColumnDialog";

const column: Column = {
  id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  name: "title",
  type: "TEXT",
  size: "",
  defaultValue: "",
  nullable: true,
  comment: "",
};

const meta = {
  title: "pages/MainScreen/ColumnDialog",
  component: ColumnDialog,
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
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
