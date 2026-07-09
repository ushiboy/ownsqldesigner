import type { Meta, StoryObj } from "@storybook/react-vite";
import Home from "@/pages/Home";

const meta = {
  title: "pages/Home",
  component: Home,
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
