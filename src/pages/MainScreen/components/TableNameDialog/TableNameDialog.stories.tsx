import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TableNameDialog } from "./TableNameDialog";

const meta = {
  title: "pages/MainScreen/TableNameDialog",
  component: TableNameDialog,
  args: {
    onSubmit: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof TableNameDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    title: "New Table",
    submitLabel: "Create",
  },
};
