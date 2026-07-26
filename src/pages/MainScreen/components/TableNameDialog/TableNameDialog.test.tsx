import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./TableNameDialog.stories";

const { Open, DuplicateName, InvalidName } = composeStories(stories);

describe("TableNameDialog", () => {
  it("shows the dialog with a disabled Create button while the input is empty", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "New Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("keeps the Create button disabled while the input is whitespace only", async () => {
    render(<Open />);
    await userEvent.type(screen.getByLabelText("Table name"), "   ");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables the Create button once a name is typed", async () => {
    render(<Open />);
    await userEvent.type(screen.getByLabelText("Table name"), "users");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("submits the trimmed name", async () => {
    const onSubmit = fn();
    render(<Open onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Table name"), "  users  ");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith("users");
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

  it("disables Create and shows a hint for a name that is already taken", () => {
    render(<DuplicateName />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.getByText("A table with this name already exists.")).toBeInTheDocument();
  });

  it("re-enables Create once a duplicate name is edited to something unique", async () => {
    render(<DuplicateName />);
    await userEvent.type(screen.getByLabelText("Table name"), "2");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("disables Create and shows a hint for a name with an invalid shape", () => {
    render(<InvalidName />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(
      screen.getByText(
        "Must start with a letter or underscore and contain only letters, digits, and underscores.",
      ),
    ).toBeInTheDocument();
  });
});
