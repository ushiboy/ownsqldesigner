import { render, screen, within } from "@testing-library/react";
// storybook/test's userEvent (not the standalone @testing-library/user-event
// package): typing into these inputs after a second composeStories `.run()`
// in this file does not reach React's onChange with the standalone package.
import { userEvent } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./SidePanel.stories";
import { SidePanel } from "./SidePanel";

const { Default, TableSelected, TableWithColumns } = composeStories(stories);

const closedProps = {
  isOpen: false,
  schemaName: "Blog Schema",
  tableCount: 0,
  createdDate: "2026-07-01",
  selectedTable: null,
  onUpdateTableName: () => {},
  onUpdateTableComment: () => {},
  onAddColumn: () => {},
  onEditColumn: () => {},
  onDeleteColumn: () => {},
};

describe("SidePanel", () => {
  it("renders as a complementary landmark while open", async () => {
    await Default.run();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("is hidden from the accessibility tree while closed", () => {
    const { container } = render(<SidePanel {...closedProps} />);
    expect(within(container).queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("keeps its content mounted while closed so the width can animate", () => {
    const { container } = render(<SidePanel {...closedProps} />);
    expect(within(container).getByText("Schema")).toBeInTheDocument();
  });

  it("shows the schema metadata", async () => {
    await Default.run();
    expect(screen.getByRole("heading", { name: "Schema" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Blog Schema")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("shows the selected table's name and comment", async () => {
    await TableSelected.run();
    expect(screen.getByRole("heading", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("users");
    expect(screen.getByLabelText("Comment")).toHaveValue("Registered users");
  });

  it("commits a comment edit immediately", async () => {
    await TableSelected.run();

    await userEvent.type(screen.getByLabelText("Comment"), "!");

    expect(TableSelected.args.onUpdateTableComment).toHaveBeenCalledWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "Registered users!",
    );
  });

  it("commits a name edit once the trimmed value is non-empty", async () => {
    await TableSelected.run();

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "accounts");

    expect(TableSelected.args.onUpdateTableName).toHaveBeenLastCalledWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "accounts",
    );
  });

  it("does not commit while the name is cleared", async () => {
    await TableSelected.run();

    await userEvent.clear(screen.getByLabelText("Name"));

    expect(TableSelected.args.onUpdateTableName).not.toHaveBeenCalled();
  });

  it("reverts the name field to the last committed value on blur while empty", async () => {
    await TableSelected.run();

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.tab();

    expect(input).toHaveValue("users");
  });

  it("shows no columns for a table without any", async () => {
    await TableSelected.run();
    expect(screen.getByRole("heading", { name: "Columns" })).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lists a table's columns with their type", async () => {
    await TableWithColumns.run();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("INTEGER")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("TEXT")).toBeInTheDocument();
  });

  it("calls onAddColumn when the Add Column button is clicked", async () => {
    await TableSelected.run();
    await userEvent.click(screen.getByRole("button", { name: "Add Column" }));
    expect(TableSelected.args.onAddColumn).toHaveBeenCalledOnce();
  });

  it("calls onEditColumn with the clicked column's id", async () => {
    await TableWithColumns.run();
    await userEvent.click(screen.getByRole("button", { name: "Edit column id" }));
    expect(TableWithColumns.args.onEditColumn).toHaveBeenCalledExactlyOnceWith(
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
    );
  });

  it("calls onDeleteColumn with the clicked column's id", async () => {
    await TableWithColumns.run();
    await userEvent.click(screen.getByRole("button", { name: "Delete column email" }));
    expect(TableWithColumns.args.onDeleteColumn).toHaveBeenCalledExactlyOnceWith(
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    );
  });
});
