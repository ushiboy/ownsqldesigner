import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RadioOption } from "./RadioOption";

const meta = {
  title: "pages/Settings/RadioOption",
  component: RadioOption,
  args: {
    name: "example",
    label: "Table + referenced column name",
    description: "e.g. users_id",
    onChange: fn(),
  },
} satisfies Meta<typeof RadioOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    checked: true,
  },
};
