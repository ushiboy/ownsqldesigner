import { screen } from "@testing-library/react";
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
} = composeStories(stories);

describe("MainScreenView", () => {
  it("renders the toolbar, canvas, and side panel regions", async () => {
    await Default.run();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("does not show a notification bar without a notification message", async () => {
    await Default.run();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the notification bar when a notification message is set", async () => {
    await WithNotification.run();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not show the schema name dialog by default", async () => {
    await Default.run();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the create dialog while activeDialog is createSchema", async () => {
    await CreateSchemaDialogOpen.run();
    expect(screen.getByRole("dialog", { name: "New Schema" })).toBeInTheDocument();
  });

  it("shows the rename dialog prefilled with the current schema name", async () => {
    await RenameSchemaDialogOpen.run();
    expect(screen.getByRole("dialog", { name: "Rename Schema" })).toBeInTheDocument();
    expect(screen.getByLabelText("Schema name")).toHaveValue("Blog Schema");
  });

  it("shows the delete confirmation naming the current schema", async () => {
    await DeleteSchemaDialogOpen.run();
    expect(screen.getByRole("dialog", { name: "Delete Schema" })).toBeInTheDocument();
    expect(screen.getByText('Delete "Blog Schema"? This cannot be undone.')).toBeInTheDocument();
  });

  it("shows the create table dialog while activeDialog is createTable", async () => {
    await CreateTableDialogOpen.run();
    expect(screen.getByRole("dialog", { name: "New Table" })).toBeInTheDocument();
  });

  it("shows the selected table's properties in the side panel", async () => {
    await TableSelected.run();
    expect(screen.getByRole("heading", { name: "Table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("users");
  });
});
