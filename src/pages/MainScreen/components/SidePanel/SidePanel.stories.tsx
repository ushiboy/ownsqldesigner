import type { Meta, StoryObj } from "@storybook/react-vite";
import { SidePanel } from "./SidePanel";

const meta = {
  title: "pages/MainScreen/SidePanel",
  component: SidePanel,
  decorators: [
    (Story) => (
      <div className="flex h-96 justify-end">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
  },
};
