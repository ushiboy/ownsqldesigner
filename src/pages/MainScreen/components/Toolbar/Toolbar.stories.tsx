import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Toolbar } from "./Toolbar";

const meta = {
  title: "pages/MainScreen/Toolbar",
  component: Toolbar,
  args: {
    onToggleSidePanel: fn(),
  },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: true,
  },
};

export const SidePanelClosed: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: false,
  },
};
