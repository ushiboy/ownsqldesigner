import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./MainScreenView.stories";

const {
  Default,
  WithNotification,
  CreateSchemaDialogOpen,
  RenameSchemaDialogOpen,
  DeleteSchemaDialogOpen,
  CreateTableDialogOpen,
  TableSelected,
  DeleteTableDialogOpen,
  AddColumnDialogOpen,
  AddColumnDialogOpenPrimaryKeyAvailable,
  EditColumnDialogOpen,
  EditPrimaryKeyColumnDialogOpen,
  DeleteColumnDialogOpen,
  AddKeyDialogOpen,
  EditKeyDialogOpen,
  DeleteKeyDialogOpen,
  TableWithRelationSelected,
  ExportSqlDialogOpen,
  DeleteRelationDialogOpen,
} = composeStories(stories);

describe("MainScreenView", () => {
  it("renders the toolbar, canvas, and side panel regions", () => {
    render(<Default />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("does not show a notification bar without a notification message", () => {
    render(<Default />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the notification bar when a notification message is set", () => {
    render(<WithNotification />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not show the schema name dialog by default", () => {
    render(<Default />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the create dialog while activeDialog is createSchema", () => {
    render(<CreateSchemaDialogOpen />);
    expect(screen.getByRole("dialog", { name: "New Schema" })).toBeInTheDocument();
  });

  it("shows the rename dialog prefilled with the current schema name", () => {
    render(<RenameSchemaDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Rename Schema" })).toBeInTheDocument();
    expect(screen.getByLabelText("Schema name")).toHaveValue("Blog Schema");
  });

  it("shows the delete confirmation naming the current schema", () => {
    render(<DeleteSchemaDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Schema" })).toBeInTheDocument();
    expect(screen.getByText('Delete "Blog Schema"? This cannot be undone.')).toBeInTheDocument();
  });

  it("shows the create table dialog while activeDialog is createTable", () => {
    render(<CreateTableDialogOpen />);
    expect(screen.getByRole("dialog", { name: "New Table" })).toBeInTheDocument();
  });

  it("shows the selected table's properties in the side panel", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("users");
  });

  it("shows the delete table confirmation naming the selected table", () => {
    render(<DeleteTableDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Table" })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Delete "users"? All its columns and keys will be removed too. This cannot be undone.',
      ),
    ).toBeInTheDocument();
  });

  it("opens the delete table confirmation when Delete is pressed while a table is selected", async () => {
    render(<TableSelected />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Table" })).toBeInTheDocument();
  });

  it("ignores Delete while another dialog is already open", async () => {
    render(<DeleteColumnDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Column" })).toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Column" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Delete Table" })).not.toBeInTheDocument();
  });

  it("ignores Delete while focus is in a text field", async () => {
    render(<TableSelected />);
    await userEvent.click(screen.getByLabelText("Name"));

    await userEvent.keyboard("{Delete}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the add column dialog while activeDialog is addColumn", () => {
    render(<AddColumnDialogOpen />);
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
  });

  it("shows the edit column dialog prefilled with the selected column", () => {
    render(<EditColumnDialogOpen />);
    const dialog = screen.getByRole("dialog", { name: "Edit Column" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("email");
  });

  it("shows the delete column confirmation naming the selected column", () => {
    render(<DeleteColumnDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Column" })).toBeInTheDocument();
    expect(screen.getByText('Delete column "email"? This cannot be undone.')).toBeInTheDocument();
  });

  it("sets the column's key membership together with the column when checked on add", async () => {
    const onAddColumn = fn();
    const onSetColumnKeyMembership = fn();
    render(
      <AddColumnDialogOpenPrimaryKeyAvailable
        onAddColumn={onAddColumn}
        onSetColumnKeyMembership={onSetColumnKeyMembership}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "code");
    await userEvent.click(within(dialog).getByLabelText("Primary Key"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(onAddColumn).toHaveBeenCalledOnce();
    const [, , generatedColumnId] = onAddColumn.mock.calls[0] ?? [];
    expect(onSetColumnKeyMembership).toHaveBeenCalledExactlyOnceWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      generatedColumnId,
      { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
    );
  });

  it("sets the column's key membership when a checkbox is toggled on edit", async () => {
    const onSetColumnKeyMembership = fn();
    render(<EditPrimaryKeyColumnDialogOpen onSetColumnKeyMembership={onSetColumnKeyMembership} />);
    const dialog = screen.getByRole("dialog", { name: "Edit Column" });
    await userEvent.click(within(dialog).getByLabelText("Primary Key"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(onSetColumnKeyMembership).toHaveBeenCalledExactlyOnceWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "e2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      { PRIMARY_KEY: false, UNIQUE: false, INDEX: false },
    );
  });

  it("shows the add key dialog with the table's columns while activeDialog is addKey", () => {
    render(<AddKeyDialogOpen />);
    const dialog = screen.getByRole("dialog", { name: "Add Key" });
    expect(within(dialog).getByLabelText("email")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("id")).toBeInTheDocument();
  });

  it("shows the edit key dialog prefilled with the selected key", () => {
    render(<EditKeyDialogOpen />);
    const dialog = screen.getByRole("dialog", { name: "Edit Key" });
    expect(within(dialog).getByLabelText("Type")).toHaveValue("PRIMARY_KEY");
    expect(within(dialog).getByLabelText("id")).toBeChecked();
  });

  it("shows the delete key confirmation naming the selected key", () => {
    render(<DeleteKeyDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Key" })).toBeInTheDocument();
    expect(
      screen.getByText('Delete key "PRIMARY KEY (id)"? This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it("shows the export SQL dialog with the generated DDL while activeDialog is exportSql", () => {
    render(<ExportSqlDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Export SQL" })).toBeInTheDocument();
    expect(screen.getByLabelText("Generated SQL")).toHaveValue(
      "CREATE TABLE users (\n  email TEXT NOT NULL,\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL\n);",
    );
  });

  it("opens the export SQL dialog when the Export SQL toolbar button is clicked", async () => {
    render(<Default />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Export SQL" }));

    expect(screen.getByRole("dialog", { name: "Export SQL" })).toBeInTheDocument();
  });

  it("lists the selected table's relations in the side panel", () => {
    render(<TableWithRelationSelected />);
    expect(screen.getByText("user_id → users.id")).toBeInTheDocument();
  });

  it("shows the delete relation confirmation naming the selected relation", () => {
    render(<DeleteRelationDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Relation" })).toBeInTheDocument();
    expect(
      screen.getByText('Delete relation "user_id → users.id"? This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it("opens the delete relation confirmation when Delete is pressed while a relation is selected", async () => {
    render(<TableWithRelationSelected selectedRelationId="c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Relation" })).toBeInTheDocument();
  });

  it("calls onRemoveForeignKey and clears the relation selection on confirm", async () => {
    const onRemoveForeignKey = fn();
    const onSelectRelation = fn();
    render(
      <DeleteRelationDialogOpen
        onRemoveForeignKey={onRemoveForeignKey}
        onSelectRelation={onSelectRelation}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(onRemoveForeignKey).toHaveBeenCalledExactlyOnceWith(
      "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
      "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    );
    expect(onSelectRelation).toHaveBeenCalledExactlyOnceWith(null);
  });
});
