import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./ConfirmDialog.stories";

const { Open } = composeStories(stories);

describe("ConfirmDialog", () => {
  it("shows the title and message", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "Delete Schema" })).toBeInTheDocument();
    expect(screen.getByText('Delete "Blog Schema"? This cannot be undone.')).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = fn();
    const onCancel = fn();
    render(<Open onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onConfirm = fn();
    const onCancel = fn();
    render(<Open onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = fn();
    render(<Open onCancel={onCancel} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
