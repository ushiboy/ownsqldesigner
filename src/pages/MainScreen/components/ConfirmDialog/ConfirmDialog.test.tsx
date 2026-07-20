import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./ConfirmDialog.stories";

const { Open } = composeStories(stories);

describe("ConfirmDialog", () => {
  it("shows the title and message", async () => {
    await Open.run();
    expect(screen.getByRole("dialog", { name: "Delete Schema" })).toBeInTheDocument();
    expect(screen.getByText('Delete "Blog Schema"? This cannot be undone.')).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    await Open.run();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(Open.args.onConfirm).toHaveBeenCalledOnce();
    expect(Open.args.onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    await Open.run();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(Open.args.onCancel).toHaveBeenCalledOnce();
    expect(Open.args.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", async () => {
    await Open.run();
    await userEvent.keyboard("{Escape}");
    expect(Open.args.onCancel).toHaveBeenCalledOnce();
  });
});
