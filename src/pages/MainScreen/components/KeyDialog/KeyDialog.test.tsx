import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./KeyDialog.stories";

const { Add, Edit, AddPrimaryKeyDisabled, EditWithMultipleColumns } = composeStories(stories);

describe("KeyDialog", () => {
  it("shows the dialog with a disabled submit button while no column is checked", () => {
    render(<Add />);
    expect(screen.getByRole("dialog", { name: "Add Key" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("defaults to the INDEX type when adding", () => {
    render(<Add />);
    expect(screen.getByLabelText("Type")).toHaveValue("INDEX");
  });

  it("enables the submit button once a column is checked", async () => {
    render(<Add />);
    await userEvent.click(screen.getByLabelText("id"));
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("submits the type together with every checked column", async () => {
    const onSubmit = fn();
    render(<Add onSubmit={onSubmit} />);
    await userEvent.selectOptions(screen.getByLabelText("Type"), "UNIQUE");
    await userEvent.click(screen.getByLabelText("id"));
    await userEvent.click(screen.getByLabelText("email"));
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      type: "UNIQUE",
      columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
    });
  });

  it("unchecking a column removes it from the submitted columnIds", async () => {
    const onSubmit = fn();
    render(<Edit onSubmit={onSubmit} />);
    expect(screen.getByLabelText("email")).toBeChecked();
    await userEvent.click(screen.getByLabelText("email"));
    await userEvent.click(screen.getByLabelText("id"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      type: "UNIQUE",
      columnIds: ["f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
    });
  });

  it("prefills the form from the initial key when editing", () => {
    render(<Edit />);
    expect(screen.getByRole("dialog", { name: "Edit Key" })).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toHaveValue("UNIQUE");
    expect(screen.getByLabelText("email")).toBeChecked();
    expect(screen.getByLabelText("id")).not.toBeChecked();
  });

  it("disables the PRIMARY KEY option when the table already has a different one", () => {
    render(<AddPrimaryKeyDisabled />);
    const dialog = screen.getByRole("dialog", { name: "Add Key" });
    expect(within(dialog).getByRole("option", { name: "PRIMARY KEY" })).toBeDisabled();
  });

  it("calls onCancel when the Cancel button is clicked", async () => {
    const onCancel = fn();
    render(<Add onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Escape is pressed", async () => {
    const onCancel = fn();
    render(<Add onCancel={onCancel} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("hides the move buttons when fewer than two columns are checked", async () => {
    render(<Add />);
    await userEvent.click(screen.getByLabelText("id"));
    expect(screen.queryByRole("button", { name: "Move id up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move id down" })).not.toBeInTheDocument();
  });

  it("shows a position number and move buttons once two or more columns are checked, but not for unchecked columns", () => {
    render(<EditWithMultipleColumns />);
    expect(screen.getByRole("button", { name: "Move team_id up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move team_id down" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move user_id up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move user_id down" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move role up" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Move role down" })).not.toBeInTheDocument();
  });

  it("disables the move-up button for the first checked column and the move-down button for the last", () => {
    render(<EditWithMultipleColumns />);
    expect(screen.getByRole("button", { name: "Move team_id up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move team_id down" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move user_id up" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move user_id down" })).toBeDisabled();
  });

  it("reorders checked columns and submits them in the new order", async () => {
    const onSubmit = fn();
    render(<EditWithMultipleColumns onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Move team_id down" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      type: "UNIQUE",
      columnIds: ["c2c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c", "c1c2c3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c"],
    });
  });
});
