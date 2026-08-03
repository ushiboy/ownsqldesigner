import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Settings.stories";

const { Default, TableIdPattern } = composeStories(stories);

const STORAGE_KEY = "ownsqldesigner:fkNamingPattern";

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
