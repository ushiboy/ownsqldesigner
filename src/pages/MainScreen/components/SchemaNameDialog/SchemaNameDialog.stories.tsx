import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { SchemaNameDialog } from "./SchemaNameDialog";

const meta = {
  title: "pages/MainScreen/SchemaNameDialog",
  component: SchemaNameDialog,
  args: {
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
} satisfies Meta<typeof SchemaNameDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    title: "New Schema",
    submitLabel: "Create",
  },
};

export const Rename: Story = {
  args: {
    open: true,
    title: "Rename Schema",
    submitLabel: "Rename",
    initialName: "Blog Schema",
  },
};
