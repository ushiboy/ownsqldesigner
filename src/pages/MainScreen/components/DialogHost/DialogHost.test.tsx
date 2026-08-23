import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./DialogHost.stories";

const {
  Default,
  CreateSchemaDialogOpen,
  RenameSchemaDialogOpen,
  DeleteSchemaDialogOpen,
  CreateTableDialogOpen,
  DeleteTableDialogOpen,
  DeleteMultipleTablesDialogOpen,
  AddColumnDialogOpen,
  EditColumnDialogOpen,
  DeleteColumnDialogOpen,
  AddKeyDialogOpen,
  EditKeyDialogOpen,
  EditReferencedKeyDialogOpen,
  DeleteKeyDialogOpen,
  DeleteReferencedKeyDialogOpen,
  ExportSqlDialogOpen,
  DeleteRelationDialogOpen,
} = composeStories(stories);

describe("DialogHost", () => {
  it("does not show any dialog by default", () => {
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

  it("shows the delete table confirmation naming the selected table", () => {
    render(<DeleteTableDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Table" })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Delete "users"? All its columns and keys will be removed too. This cannot be undone.',
      ),
    ).toBeInTheDocument();
  });

  it("shows the delete confirmation naming the count when multiple tables are selected", () => {
    render(<DeleteMultipleTablesDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Tables" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Delete 2 selected tables? All their columns and keys will be removed too. This cannot be undone.",
      ),
    ).toBeInTheDocument();
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

  it("blocks Save with a hint when retyping a referenced key away from PRIMARY KEY/UNIQUE in the edit key dialog", async () => {
    render(<EditReferencedKeyDialogOpen />);
    const dialog = screen.getByRole("dialog", { name: "Edit Key" });
    await userEvent.selectOptions(within(dialog).getByLabelText("Type"), "INDEX");
    expect(
      within(dialog).getByText(
        "A foreign key on another table references this key. It must stay a single-column PRIMARY KEY or UNIQUE key on the same column.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows the delete key confirmation naming the selected key", () => {
    render(<DeleteKeyDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Key" })).toBeInTheDocument();
    expect(
      screen.getByText('Delete key "PRIMARY KEY (id)"? This cannot be undone.'),
    ).toBeInTheDocument();
  });

  it("warns about the cascading relation removal when the selected key is referenced by a foreign key", () => {
    render(<DeleteReferencedKeyDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Key" })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Delete key "PRIMARY KEY (id)"? A foreign key on another table references it — that relation will be removed too. This cannot be undone.',
      ),
    ).toBeInTheDocument();
  });

  it("shows the export SQL dialog with the generated DDL while activeDialog is exportSql", () => {
    render(<ExportSqlDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Export SQL" })).toBeInTheDocument();
    expect(screen.getByLabelText("Generated SQL")).toHaveValue(
      "CREATE TABLE users (\n  email TEXT NOT NULL,\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL\n);",
    );
  });

  it("shows the delete relation confirmation naming the selected relation", () => {
    render(<DeleteRelationDialogOpen />);
    expect(screen.getByRole("dialog", { name: "Delete Relation" })).toBeInTheDocument();
    expect(
      screen.getByText('Delete relation "user_id → users.id"? This cannot be undone.'),
    ).toBeInTheDocument();
  });
});
