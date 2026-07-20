import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./SchemaNameDialog.stories";

const { Open, Rename } = composeStories(stories);

describe("SchemaNameDialog", () => {
  it("shows the dialog with a disabled Create button while the input is empty", async () => {
    await Open.run();
    expect(screen.getByRole("dialog", { name: "New Schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("keeps the Create button disabled while the input is whitespace only", async () => {
    await Open.run();
    await userEvent.type(screen.getByLabelText("Schema name"), "   ");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("enables the Create button once a name is typed", async () => {
    await Open.run();
    await userEvent.type(screen.getByLabelText("Schema name"), "Blog Schema");
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("submits the trimmed name", async () => {
    await Open.run();
    await userEvent.type(screen.getByLabelText("Schema name"), "  Blog Schema  ");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(Open.args.onSubmit).toHaveBeenCalledExactlyOnceWith("Blog Schema");
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    await Open.run();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(Open.args.onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    await Open.run();
    await userEvent.keyboard("{Escape}");
    expect(Open.args.onCancel).toHaveBeenCalledOnce();
  });

  it("shows the rename variant prefilled with the current name", async () => {
    await Rename.run();
    expect(screen.getByRole("dialog", { name: "Rename Schema" })).toBeInTheDocument();
    expect(screen.getByLabelText("Schema name")).toHaveValue("Blog Schema");
    expect(screen.getByRole("button", { name: "Rename" })).toBeEnabled();
  });

  it("disables the rename submit once the prefilled name is cleared", async () => {
    await Rename.run();
    await userEvent.clear(screen.getByLabelText("Schema name"));
    expect(screen.getByRole("button", { name: "Rename" })).toBeDisabled();
  });

  it("submits the edited name from the rename variant", async () => {
    await Rename.run();
    const input = screen.getByLabelText("Schema name");
    await userEvent.clear(input);
    await userEvent.type(input, "Journal Schema");
    await userEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(Rename.args.onSubmit).toHaveBeenCalledExactlyOnceWith("Journal Schema");
  });
});
