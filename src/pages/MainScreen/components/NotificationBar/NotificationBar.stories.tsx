import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { NotificationProvider } from "../../NotificationContext";
import { NotificationBar } from "./NotificationBar";

const meta = {
  title: "pages/MainScreen/NotificationBar",
  component: NotificationBar,
  decorators: [
    (Story) => (
      <LocaleProvider>
        <NotificationProvider initialNotification="Cannot delete column: referenced by a foreign key">
          <div className="relative h-24">
            <Story />
          </div>
        </NotificationProvider>
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof NotificationBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
