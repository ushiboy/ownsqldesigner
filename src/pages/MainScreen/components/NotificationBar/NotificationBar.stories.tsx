import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationBar } from "./NotificationBar";

const meta = {
  title: "pages/MainScreen/NotificationBar",
  component: NotificationBar,
  decorators: [
    (Story) => (
      <div className="relative h-24">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotificationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    message: "Cannot delete column: referenced by a foreign key",
  },
};
