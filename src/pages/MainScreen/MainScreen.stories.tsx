import type { Meta, StoryObj } from "@storybook/react-vite";
import MainScreen from "./MainScreen";

const meta = {
  title: "pages/MainScreen",
  component: MainScreen,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MainScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
