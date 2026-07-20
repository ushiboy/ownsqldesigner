import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ConfirmDialog } from "./ConfirmDialog";

const meta = {
  title: "pages/MainScreen/ConfirmDialog",
  component: ConfirmDialog,
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    title: "Delete Schema",
    message: 'Delete "Blog Schema"? This cannot be undone.',
    confirmLabel: "Delete",
  },
};
