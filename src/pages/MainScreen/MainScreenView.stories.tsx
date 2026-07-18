import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MainScreenView } from "./MainScreenView";

const meta = {
  title: "pages/MainScreen/MainScreenView",
  component: MainScreenView,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onToggleSidePanel: fn(),
  },
} satisfies Meta<typeof MainScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notificationMessage: null,
    isSidePanelOpen: true,
  },
};

export const SidePanelClosed: Story = {
  args: {
    notificationMessage: null,
    isSidePanelOpen: false,
  },
};

export const WithNotification: Story = {
  args: {
    notificationMessage: "Cannot delete column: referenced by a foreign key",
    isSidePanelOpen: true,
  },
};
