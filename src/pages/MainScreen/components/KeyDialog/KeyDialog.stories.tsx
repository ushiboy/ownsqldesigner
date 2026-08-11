import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { Column, Key } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { KeyDialog } from "./KeyDialog";

const columns: Pick<Column, "id" | "name">[] = [
  { id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "id" },
  { id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d", name: "email" },
];

const key: Key = {
  id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  type: "UNIQUE",
  columnIds: ["a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
};

const threeColumns: Pick<Column, "id" | "name">[] = [
  { id: "c1c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "team_id" },
  { id: "c2c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "user_id" },
  { id: "c3c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", name: "role" },
];

const compositeKey: Key = {
  id: "d1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  type: "UNIQUE",
  columnIds: ["c1c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "c2c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
};

const meta = {
  title: "pages/MainScreen/KeyDialog",
  component: KeyDialog,
  args: {
    columns,
    primaryKeyDisabled: false,
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
} satisfies Meta<typeof KeyDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Add: Story = {
  args: {
    open: true,
    title: "Add Key",
    submitLabel: "Add",
  },
};

export const Edit: Story = {
  args: {
    open: true,
    title: "Edit Key",
    submitLabel: "Save",
    initialKey: key,
  },
};

export const AddPrimaryKeyDisabled: Story = {
  args: {
    open: true,
    title: "Add Key",
    submitLabel: "Add",
    primaryKeyDisabled: true,
  },
};

export const EditWithMultipleColumns: Story = {
  args: {
    open: true,
    title: "Edit Key",
    submitLabel: "Save",
    columns: threeColumns,
    initialKey: compositeKey,
  },
};
