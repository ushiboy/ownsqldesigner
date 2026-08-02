import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LocaleProvider } from "../../../../i18n/LocaleProvider";
import { TableNameDialog } from "./TableNameDialog";

const meta = {
  title: "pages/MainScreen/TableNameDialog",
  component: TableNameDialog,
  args: {
    existingNames: [],
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => (
      <LocaleProvider>
        <Story />
      </LocaleProvider>
    ),
  ],
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

export const DuplicateName: Story = {
  args: {
    open: true,
    title: "New Table",
    submitLabel: "Create",
    initialName: "users",
    existingNames: ["users", "posts"],
  },
};

export const InvalidName: Story = {
  args: {
    open: true,
    title: "New Table",
    submitLabel: "Create",
    initialName: "1users",
  },
};
