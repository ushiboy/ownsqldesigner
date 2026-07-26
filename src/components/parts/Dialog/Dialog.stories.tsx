import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Dialog } from "./Dialog";
import { dialogActionButton } from "./dialogActionButton";

const meta = {
  title: "components/parts/Dialog",
  component: Dialog,
  args: {
    onClose: fn(),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: {
    open: true,
    title: "Dialog Title",
    children: (
      <>
        <p className="mt-4 text-[14px]">Dialog content goes here.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className={dialogActionButton({ variant: "secondary" })}>
            Cancel
          </button>
          <button
            type="button"
            data-autofocus
            className={dialogActionButton({ variant: "primary" })}
          >
            OK
          </button>
        </div>
      </>
    ),
  },
};

export const Large: Story = {
  args: {
    ...Open.args,
    size: "large",
  },
};
