import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./MainScreenView.stories";

const {
  Default,
  SidePanelClosed,
  DarkTheme,
  WithNotification,
  TableSelected,
  MultipleTablesSelected,
  AddColumnDialogOpenPrimaryKeyAvailable,
  EditPrimaryKeyColumnDialogOpen,
  TableWithRelationSelected,
  RelationSelected,
  DeleteColumnDialogOpen,
  DeleteRelationDialogOpen,
} = composeStories(stories);

describe("MainScreenView", () => {
  it("renders the toolbar, canvas, and side panel regions", () => {
    render(<Default />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("takes the side panel out of the accessibility tree while it is closed", () => {
    render(<SidePanelClosed />);
    expect(screen.queryByRole("complementary", { name: "Side panel" })).not.toBeInTheDocument();
  });

  it("reopens the side panel from the toolbar toggle", async () => {
    render(<SidePanelClosed />);

    await userEvent.click(screen.getByRole("button", { name: "Toggle side panel" }));

    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("threads the resolved theme into the canvas so React Flow's own chrome follows dark mode", () => {
    render(<DarkTheme />);
    expect(screen.getByTestId("rf__wrapper")).toHaveClass("dark");
  });

  it("does not show a notification bar without a notification message", () => {
    render(<Default />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the notification bar when a notification message is set", () => {
    render(<WithNotification />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows the selected table's properties in the side panel", () => {
    render(<TableSelected />);
    expect(screen.getByRole("heading", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("users");
  });

  it("opens the delete table confirmation when Delete is pressed while a table is selected", async () => {
    render(<TableSelected />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Table" })).toBeInTheDocument();
  });

  it("opens the delete tables confirmation when Delete is pressed with multiple tables selected", async () => {
    render(<MultipleTablesSelected />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Tables" })).toBeInTheDocument();
  });

  it("removes every selected table on confirm when multiple tables are selected", async () => {
    render(<MultipleTablesSelected />);
    expect(await screen.findByRole("button", { name: "Table users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table posts" })).toBeInTheDocument();

    await userEvent.keyboard("{Delete}");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Table users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Table posts" })).not.toBeInTheDocument();
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

  it("adds the column and its primary key together when checked on add", async () => {
    render(<AddColumnDialogOpenPrimaryKeyAvailable />);
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    await userEvent.type(within(dialog).getByLabelText("Name"), "code");
    await userEvent.click(within(dialog).getByLabelText("Primary Key"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));

    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("code")).toBeInTheDocument();
    expect(within(sidePanel).getByText("PRIMARY KEY (code)")).toBeInTheDocument();
  });

  it("removes the column's primary key when the checkbox is unticked on edit", async () => {
    render(<EditPrimaryKeyColumnDialogOpen />);
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("PRIMARY KEY (id)")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog", { name: "Edit Column" });
    await userEvent.click(within(dialog).getByLabelText("Primary Key"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    console.log("DEBUG sidePanel html:", sidePanel.innerHTML);

    expect(within(sidePanel).queryByText("PRIMARY KEY (id)")).not.toBeInTheDocument();
  });

  it("opens the export SQL dialog when the Export SQL toolbar menu item is clicked", async () => {
    render(<Default />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Export/Import" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Export SQL" }));

    expect(screen.getByRole("dialog", { name: "Export SQL" })).toBeInTheDocument();
  });

  it("lists the selected table's relations in the side panel", () => {
    render(<TableWithRelationSelected />);
    expect(screen.getByText("user_id → users.id")).toBeInTheDocument();
  });

  it("opens the delete relation confirmation when Delete is pressed while a relation is selected", async () => {
    render(<RelationSelected />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Delete}");

    expect(screen.getByRole("dialog", { name: "Delete Relation" })).toBeInTheDocument();
  });

  it("removes the relation and clears the relation selection on confirm", async () => {
    render(<DeleteRelationDialogOpen />);
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("user_id → users.id")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(within(sidePanel).queryByText("user_id → users.id")).not.toBeInTheDocument();
    // The relation selection is reset, so the next Delete acts on the table
    // that is still selected rather than reopening the stale relation.
    await userEvent.keyboard("{Delete}");
    expect(screen.getByRole("dialog", { name: "Delete Table" })).toBeInTheDocument();
  });
});
