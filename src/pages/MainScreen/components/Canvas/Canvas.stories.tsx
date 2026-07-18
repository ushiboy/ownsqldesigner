import type { Meta, StoryObj } from "@storybook/react-vite";
import { Canvas } from "./Canvas";

const meta = {
  title: "pages/MainScreen/Canvas",
  component: Canvas,
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
