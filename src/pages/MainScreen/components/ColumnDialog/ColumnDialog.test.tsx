import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./ColumnDialog.stories";

const { Add, Edit } = composeStories(stories);

describe("ColumnDialog", () => {
  it("shows the dialog with a disabled submit button while the name is empty", async () => {
    await Add.run();
    expect(screen.getByRole("dialog", { name: "Add Column" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("defaults to the TEXT type and nullable checked when adding", async () => {
    await Add.run();
    expect(screen.getByLabelText("Type")).toHaveValue("TEXT");
    expect(screen.getByLabelText("Nullable")).toBeChecked();
  });

  it("enables the submit button once a name is typed", async () => {
    await Add.run();
    await userEvent.type(screen.getByLabelText("Name"), "title");
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("submits the trimmed name together with the other fields", async () => {
    await Add.run();
    await userEvent.type(screen.getByLabelText("Name"), "  title  ");
    await userEvent.selectOptions(screen.getByLabelText("Type"), "INTEGER");
    await userEvent.type(screen.getByLabelText("Size"), "10");
    await userEvent.type(screen.getByLabelText("Default value"), "0");
    await userEvent.click(screen.getByLabelText("Nullable"));
    await userEvent.type(screen.getByLabelText("Comment"), "Post title");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(Add.args.onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: "title",
      type: "INTEGER",
      size: "10",
      defaultValue: "0",
      nullable: false,
      comment: "Post title",
    });
  });

  it("prefills the form from the initial column when editing", async () => {
    await Edit.run();
    expect(screen.getByRole("dialog", { name: "Edit Column" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("title");
    expect(screen.getByLabelText("Type")).toHaveValue("TEXT");
    expect(screen.getByLabelText("Nullable")).toBeChecked();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    await Add.run();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(Add.args.onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    await Add.run();
    await userEvent.keyboard("{Escape}");
    expect(Add.args.onCancel).toHaveBeenCalledOnce();
  });
});
