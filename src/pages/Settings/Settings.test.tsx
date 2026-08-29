import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Settings.stories";

const { Default, TableIdPattern, WithDefaultColumnTemplates } = composeStories(stories);

const STORAGE_KEY = "ownsqldesigner:fkNamingPattern";
const DEFAULT_COLUMNS_STORAGE_KEY = "ownsqldesigner:defaultColumnTemplates";

describe("Settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the heading and a link back to the editor", () => {
    render(<Default />);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to editor" })).toHaveAttribute("href", "/");
  });

  it("defaults to the tableColumn naming pattern", () => {
    render(<Default />);

    expect(screen.getByRole("radio", { name: /Table \+ referenced column name/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Table name \+ "id"/ })).not.toBeChecked();
  });

  it("renders the default columns section", () => {
    render(<Default />);

    expect(screen.getByRole("heading", { name: "Default Columns" })).toBeInTheDocument();
    expect(screen.getByText("No default columns configured for this dialect.")).toBeInTheDocument();
  });

  it("seeds default column templates via initialDefaultColumnTemplates", () => {
    render(<WithDefaultColumnTemplates />);

    expect(screen.getByText("id")).toBeInTheDocument();
  });

  it("persists an added default column to storage", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("button", { name: "Add Column" }));
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    await user.type(within(dialog).getByLabelText("Name"), "created_at");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    const stored = JSON.parse(localStorage.getItem(DEFAULT_COLUMNS_STORAGE_KEY) ?? "{}");
    expect(stored.sqlite).toMatchObject([{ name: "created_at" }]);
  });

  it("seeds the tableId naming pattern via initialFkNamingPattern", () => {
    render(<TableIdPattern />);

    expect(screen.getByRole("radio", { name: /Table name \+ "id"/ })).toBeChecked();
  });

  it("switches the naming pattern and persists it to storage", async () => {
    const user = userEvent.setup();
    render(<Default />);

    await user.click(screen.getByRole("radio", { name: /Table name \+ "id"/ }));

    expect(screen.getByRole("radio", { name: /Table name \+ "id"/ })).toBeChecked();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("tableId");
  });
});
