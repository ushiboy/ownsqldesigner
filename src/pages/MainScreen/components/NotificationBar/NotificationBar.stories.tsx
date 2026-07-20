import type { Meta, StoryObj } from "@storybook/react-vite";
import { NotificationProvider } from "../../NotificationContext";
import { NotificationBar } from "./NotificationBar";

const meta = {
  title: "pages/MainScreen/NotificationBar",
  component: NotificationBar,
  decorators: [
    (Story) => (
      <NotificationProvider initialNotification="Cannot delete column: referenced by a foreign key">
        <div className="relative h-24">
          <Story />
        </div>
      </NotificationProvider>
    ),
  ],
} satisfies Meta<typeof NotificationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
