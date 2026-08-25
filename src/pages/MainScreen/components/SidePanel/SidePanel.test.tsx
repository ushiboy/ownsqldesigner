import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import { sqliteDialectStrategy } from "../../../../domain/sqlite/sqliteDialectStrategy";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import * as stories from "./SidePanel.stories";
import { SidePanel } from "./SidePanel";

const {
  Default,
  TableSelected,
  TableWithColumns,
  TableWithKeys,
  TableWithRelations,
  TableSelectedWithSiblings,
  MultipleTablesSelected,
} = composeStories(stories);

const closedProps = {
  isOpen: false,
  schemaName: "Blog Schema",
  tableCount: 0,
  createdDate: "2026-07-01",
  dialect: "sqlite" as const,
  selectedTable: null,
  selectedTableCount: 0,
  strategy: sqliteDialectStrategy,
  existingTableNames: [],
  relations: [],
  onUpdateTableName: () => {},
  onUpdateTableComment: () => {},
  onDeleteTable: () => {},
  onAddColumn: () => {},
  onEditColumn: () => {},
  onDeleteColumn: () => {},
  onMoveColumnUp: () => {},
  onMoveColumnDown: () => {},
  onAddKey: () => {},
  onEditKey: () => {},
  onDeleteKey: () => {},
  onDeleteRelation: () => {},
};

describe("SidePanel", () => {
  it("renders as a complementary landmark while open", () => {
    render(<Default />);
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("is hidden from the accessibility tree while closed", () => {
    const { container } = render(
      <LocaleProvider>
        <SidePanel {...closedProps} />
      </LocaleProvider>,
    );
    expect(within(container).queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("keeps its content mounted while closed so the width can animate", () => {
    const { container } = render(
      <LocaleProvider>
        <SidePanel {...closedProps} />
      </LocaleProvider>,
    );
    expect(within(container).getByText("Schema")).toBeInTheDocument();
  });

  it("shows the schema metadata", () => {
    render(<Default />);
    expect(screen.getByRole("heading", { name: "Schema" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Blog Schema")).toBeInTheDocument();
    expect(screen.getByText("Dialect")).toBeInTheDocument();
    expect(screen.getByText("SQLite")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("shows a selection count instead of the schema metadata when 2+ tables are selected", () => {
    render(<MultipleTablesSelected />);
    expect(screen.getByRole("heading", { name: "2 tables selected" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Schema" })).not.toBeInTheDocument();
  });

  it("shows the PostgreSQL dialect label when the schema is a PostgreSQL schema", () => {
    render(
      <LocaleProvider>
        <SidePanel {...closedProps} isOpen dialect="postgresql" />
      </LocaleProvider>,
    );
    expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("shows the selected table's name and comment", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("users");
    expect(screen.getByLabelText("Comment")).toHaveValue("Registered users");
  });

  it("commits a comment edit immediately", async () => {
    const onUpdateTableComment = fn();
    render(<TableSelected onUpdateTableComment={onUpdateTableComment} />);

    await userEvent.type(screen.getByLabelText("Comment"), "!");

    expect(onUpdateTableComment).toHaveBeenCalledWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "Registered users!",
    );
  });

  it("commits a name edit once the trimmed value is non-empty", async () => {
    const onUpdateTableName = fn();
    render(<TableSelected onUpdateTableName={onUpdateTableName} />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "accounts");

    expect(onUpdateTableName).toHaveBeenLastCalledWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "accounts",
    );
  });

  it("does not commit while the name is cleared", async () => {
    const onUpdateTableName = fn();
    render(<TableSelected onUpdateTableName={onUpdateTableName} />);

    await userEvent.clear(screen.getByLabelText("Name"));

    expect(onUpdateTableName).not.toHaveBeenCalled();
  });

  it("reverts the name field to the last committed value on blur while empty", async () => {
    render(<TableSelected />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.tab();

    expect(input).toHaveValue("users");
  });

  it("does not commit a rename to a name already used by a sibling table, and shows a hint", async () => {
    const onUpdateTableName = fn();
    render(<TableSelectedWithSiblings onUpdateTableName={onUpdateTableName} />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "posts");

    // Each intermediate keystroke ("p", "po", ...) is a valid, unique name and
    // does commit; only the final, fully-typed duplicate "posts" is rejected.
    expect(onUpdateTableName).not.toHaveBeenLastCalledWith(expect.anything(), "posts");
    expect(screen.getByText("A table with this name already exists.")).toBeInTheDocument();
  });

  it("does not commit a rename to an invalid identifier shape, and shows a hint", async () => {
    const onUpdateTableName = fn();
    render(<TableSelectedWithSiblings onUpdateTableName={onUpdateTableName} />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "1abc");

    expect(onUpdateTableName).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Must start with a letter or underscore and contain only letters, digits, and underscores.",
      ),
    ).toBeInTheDocument();
  });

  it("reverts the name field to the last committed value on blur while invalid", async () => {
    render(<TableSelectedWithSiblings />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "posts");
    await userEvent.tab();

    expect(input).toHaveValue("users");
  });

  it("does not commit a rename to a SQL reserved keyword, and shows a hint", async () => {
    const onUpdateTableName = fn();
    render(<TableSelectedWithSiblings onUpdateTableName={onUpdateTableName} />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "order");

    expect(onUpdateTableName).not.toHaveBeenLastCalledWith(expect.anything(), "order");
    expect(
      screen.getByText("This name is a SQL reserved keyword and cannot be used."),
    ).toBeInTheDocument();
  });

  it("reverts the name field to the last committed value on blur while reserved", async () => {
    render(<TableSelectedWithSiblings />);

    const input = screen.getByLabelText("Name");
    await userEvent.clear(input);
    await userEvent.type(input, "order");
    await userEvent.tab();

    expect(input).toHaveValue("users");
  });

  it("calls onDeleteTable when the delete table button is clicked", async () => {
    const onDeleteTable = fn();
    render(<TableSelected onDeleteTable={onDeleteTable} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete table" }));
    expect(onDeleteTable).toHaveBeenCalledOnce();
  });

  it("shows no columns for a table without any", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Columns" })).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("lists a table's columns with their type", () => {
    render(<TableWithColumns />);
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("INTEGER")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("TEXT")).toBeInTheDocument();
  });

  it("calls onAddColumn when the Add Column button is clicked", async () => {
    const onAddColumn = fn();
    render(<TableSelected onAddColumn={onAddColumn} />);
    await userEvent.click(screen.getByRole("button", { name: "Add Column" }));
    expect(onAddColumn).toHaveBeenCalledOnce();
  });

  it("calls onEditColumn with the clicked column's id", async () => {
    const onEditColumn = fn();
    render(<TableWithColumns onEditColumn={onEditColumn} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit column id" }));
    expect(onEditColumn).toHaveBeenCalledExactlyOnceWith("f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c");
  });

  it("calls onDeleteColumn with the clicked column's id", async () => {
    const onDeleteColumn = fn();
    render(<TableWithColumns onDeleteColumn={onDeleteColumn} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete column email" }));
    expect(onDeleteColumn).toHaveBeenCalledExactlyOnceWith("a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d");
  });

  it("calls onMoveColumnUp with the table and clicked column's id", async () => {
    const onMoveColumnUp = fn();
    render(<TableWithColumns onMoveColumnUp={onMoveColumnUp} />);
    await userEvent.click(screen.getByRole("button", { name: "Move email up" }));
    expect(onMoveColumnUp).toHaveBeenCalledExactlyOnceWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    );
  });

  it("calls onMoveColumnDown with the table and clicked column's id", async () => {
    const onMoveColumnDown = fn();
    render(<TableWithColumns onMoveColumnDown={onMoveColumnDown} />);
    await userEvent.click(screen.getByRole("button", { name: "Move id down" }));
    expect(onMoveColumnDown).toHaveBeenCalledExactlyOnceWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
      "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
    );
  });

  it("disables move-up for the first column and move-down for the last column", () => {
    render(<TableWithColumns />);
    expect(screen.getByRole("button", { name: "Move id up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move id down" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move email up" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move email down" })).toBeDisabled();
  });

  it("shows no keys for a table without any", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Keys" })).toBeInTheDocument();
  });

  it("lists a table's keys with a computed label", () => {
    render(<TableWithKeys />);
    expect(screen.getByText("PRIMARY KEY (id)")).toBeInTheDocument();
    expect(screen.getByText("UNIQUE (email)")).toBeInTheDocument();
  });

  it("sets the full label as a title so a truncated key row is still readable on hover", () => {
    render(<TableWithKeys />);
    expect(screen.getByText("PRIMARY KEY (id)")).toHaveAttribute("title", "PRIMARY KEY (id)");
    expect(screen.getByText("UNIQUE (email)")).toHaveAttribute("title", "UNIQUE (email)");
  });

  it("calls onAddKey when the Add Key button is clicked", async () => {
    const onAddKey = fn();
    render(<TableWithKeys onAddKey={onAddKey} />);
    await userEvent.click(screen.getByRole("button", { name: "Add Key" }));
    expect(onAddKey).toHaveBeenCalledOnce();
  });

  it("calls onEditKey with the clicked key's id", async () => {
    const onEditKey = fn();
    render(<TableWithKeys onEditKey={onEditKey} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit key PRIMARY KEY (id)" }));
    expect(onEditKey).toHaveBeenCalledExactlyOnceWith("b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e");
  });

  it("calls onDeleteKey with the clicked key's id", async () => {
    const onDeleteKey = fn();
    render(<TableWithKeys onDeleteKey={onDeleteKey} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete key UNIQUE (email)" }));
    expect(onDeleteKey).toHaveBeenCalledExactlyOnceWith("c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f");
  });

  it("shows no relations for a table without any", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Relations" })).toBeInTheDocument();
  });

  it("lists a table's relations with their computed label, and no add/edit affordance", () => {
    render(<TableWithRelations />);
    expect(screen.getByText("user_id → users.id")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Relation" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit relation user_id → users.id" }),
    ).not.toBeInTheDocument();
  });

  it("calls onDeleteRelation with the clicked relation's id", async () => {
    const onDeleteRelation = fn();
    render(<TableWithRelations onDeleteRelation={onDeleteRelation} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Delete relation user_id → users.id" }),
    );
    expect(onDeleteRelation).toHaveBeenCalledExactlyOnceWith(
      "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
    );
  });
});
