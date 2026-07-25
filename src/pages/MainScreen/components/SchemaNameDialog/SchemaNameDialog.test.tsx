import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./SchemaNameDialog.stories";

const { Open, Rename } = composeStories(stories);

describe("SchemaNameDialog", () => {
  it("shows the dialog with a disabled Create button while the input is empty", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "New Schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("keeps the Create button disabled while the input is whitespace only", async () => {
    render(<Open />);
    await userEvent.type(screen.getByLabelText("Schema name"), "   ");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables the Create button once a name is typed", async () => {
    render(<Open />);
    await userEvent.type(screen.getByLabelText("Schema name"), "Blog Schema");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("submits the trimmed name", async () => {
    const onSubmit = fn();
    render(<Open onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Schema name"), "  Blog Schema  ");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Blog Schema");
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onCancel = fn();
    render(<Open onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = fn();
    render(<Open onCancel={onCancel} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows the rename variant prefilled with the current name", () => {
    render(<Rename />);
    expect(screen.getByRole("dialog", { name: "Rename Schema" })).toBeInTheDocument();
    expect(screen.getByLabelText("Schema name")).toHaveValue("Blog Schema");
    expect(screen.getByRole("button", { name: "Rename" })).toBeEnabled();
  });

  it("disables the rename submit once the prefilled name is cleared", async () => {
    render(<Rename />);
    await userEvent.clear(screen.getByLabelText("Schema name"));
    expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
  });

  it("submits the edited name from the rename variant", async () => {
    const onSubmit = fn();
    render(<Rename onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Schema name");
    await userEvent.clear(input);
    await userEvent.type(input, "Journal Schema");
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("Journal Schema");
  });
});
