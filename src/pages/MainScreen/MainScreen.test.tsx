import { screen, waitFor, within } from "@testing-library/react";
// storybook/test's userEvent: typing into inputs after Story.run() does not
// reach React onChange with the standalone @testing-library/user-event.
import { userEvent } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./MainScreen.stories";

const { Default } = composeStories(stories);

/** Waits until the startup restore has finished and the schema name is shown. */
async function runRestored() {
  await Default.run();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Blog Schema" })).toBeInTheDocument(),
  );
}

describe("MainScreen", () => {
  it("hides the side panel when the toggle is clicked and shows it again on a second click", async () => {
    await runRestored();
    const toggle = screen.getByRole("button", { name: "Toggle side panel" });

    await userEvent.click(toggle);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("restores the last-edited schema into the toolbar and side panel", async () => {
    await runRestored();
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("Blog Schema")).toBeInTheDocument();
    expect(within(sidePanel).getByText("0")).toBeInTheDocument();
    expect(within(sidePanel).getByText("2026-07-01")).toBeInTheDocument();
  });

  it("lists the saved schemas in the dropdown menu", async () => {
    await runRestored();
    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("menuitem", { name: "Shop Schema" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "+ New Schema" })).toBeEnabled();
  });

  it("creates a new schema through the dropdown and name dialog", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "+ New Schema" }));

    const dialog = screen.getByRole("dialog", { name: "New Schema" });
    await userEvent.type(within(dialog).getByLabelText("Schema name"), "  My New Schema  ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "My New Schema" })).toBeInTheDocument(),
    );
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("My New Schema")).toBeInTheDocument();

    // The new schema is persisted and joins the saved list.
    await userEvent.click(screen.getByRole("button", { name: "My New Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "My New Schema" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toBeInTheDocument();
  });

  it("closes the name dialog without creating a schema when cancelled", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "+ New Schema" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blog Schema" })).toBeInTheDocument();
  });

  it("marks the current schema in the dropdown menu", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));

    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toHaveAttribute(
        "aria-current",
        "true",
      ),
    );
    expect(screen.getByRole("menuitem", { name: "Shop Schema" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("switches to a schema selected from the dropdown menu", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Shop Schema" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Shop Schema" })).toBeInTheDocument(),
    );
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("Shop Schema")).toBeInTheDocument();
    expect(within(sidePanel).getByText("2026-07-02")).toBeInTheDocument();

    // The switched-to schema is now marked current in the menu.
    await userEvent.click(screen.getByRole("button", { name: "Shop Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Shop Schema" })).toHaveAttribute(
        "aria-current",
        "true",
      ),
    );
  });

  it("renames the current schema through the rename dialog", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Rename schema" }));

    const dialog = screen.getByRole("dialog", { name: "Rename Schema" });
    const input = within(dialog).getByLabelText("Schema name");
    expect(input).toHaveValue("Blog Schema");
    await userEvent.clear(input);
    await userEvent.type(input, "Journal Schema");
    await userEvent.click(within(dialog).getByRole("button", { name: "Rename" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Journal Schema" })).toBeInTheDocument(),
    );
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("Journal Schema")).toBeInTheDocument();

    // The renamed schema keeps its place in the saved list.
    await userEvent.click(screen.getByRole("button", { name: "Journal Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Journal Schema" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("menuitem", { name: "Blog Schema" })).not.toBeInTheDocument();
  });

  it("closes the rename dialog without renaming when cancelled", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Rename schema" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blog Schema" })).toBeInTheDocument();
  });

  it("deletes the current schema and switches to the most-recently-updated one", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Delete schema" }));

    const dialog = screen.getByRole("dialog", { name: "Delete Schema" });
    expect(
      within(dialog).getByText('Delete "Blog Schema"? This cannot be undone.'),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Shop Schema" })).toBeInTheDocument(),
    );

    // The deleted schema is gone from the saved list.
    await userEvent.click(screen.getByRole("button", { name: "Shop Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Shop Schema" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("menuitem", { name: "Blog Schema" })).not.toBeInTheDocument();
  });

  it("auto-creates a blank schema when the last saved schema is deleted", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Delete schema" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Shop Schema" })).toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Delete schema" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "New Schema" })).toBeInTheDocument(),
    );
  });

  it("closes the delete confirmation without deleting when cancelled", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Delete schema" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blog Schema" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Blog Schema" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toBeInTheDocument(),
    );
  });

  it("creates a table through the toolbar and edits it from the side panel", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Add Table" }));
    const dialog = screen.getByRole("dialog", { name: "New Table" });
    await userEvent.type(within(dialog).getByLabelText("Table name"), "users");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const node = await screen.findByRole("button", { name: "Table users" });
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });
    expect(within(sidePanel).getByText("1")).toBeInTheDocument();

    await userEvent.click(node);
    expect(within(sidePanel).getByRole("heading", { name: "Table" })).toBeInTheDocument();
    const nameInput = within(sidePanel).getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "accounts");
    await userEvent.type(within(sidePanel).getByLabelText("Comment"), "Registered users");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Table accounts" })).toBeInTheDocument();
    });
    expect(within(sidePanel).getByLabelText("Comment")).toHaveValue("Registered users");
  });

  it("adds, edits, and deletes a column from the side panel", async () => {
    await runRestored();

    await userEvent.click(screen.getByRole("button", { name: "Add Table" }));
    const createTableDialog = screen.getByRole("dialog", { name: "New Table" });
    await userEvent.type(within(createTableDialog).getByLabelText("Table name"), "users");
    await userEvent.click(within(createTableDialog).getByRole("button", { name: "Create" }));

    const node = await screen.findByRole("button", { name: "Table users" });
    await userEvent.click(node);
    const sidePanel = screen.getByRole("complementary", { name: "Side panel" });

    await userEvent.click(within(sidePanel).getByRole("button", { name: "Add Column" }));
    const addDialog = screen.getByRole("dialog", { name: "Add Column" });
    await userEvent.type(within(addDialog).getByLabelText("Name"), "email");
    await userEvent.click(within(addDialog).getByRole("button", { name: "Add" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(sidePanel).getByText("email")).toBeInTheDocument();
    await waitFor(() => {
      expect(within(node).getByText("email")).toBeInTheDocument();
    });

    await userEvent.click(within(sidePanel).getByRole("button", { name: "Edit column email" }));
    const editDialog = screen.getByRole("dialog", { name: "Edit Column" });
    const editNameInput = within(editDialog).getByLabelText("Name");
    await userEvent.clear(editNameInput);
    await userEvent.type(editNameInput, "email_address");
    await userEvent.click(within(editDialog).getByRole("button", { name: "Save" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(sidePanel).getByText("email_address")).toBeInTheDocument();

    await userEvent.click(
      within(sidePanel).getByRole("button", { name: "Delete column email_address" }),
    );
    const deleteDialog = screen.getByRole("dialog", { name: "Delete Column" });
    expect(
      within(deleteDialog).getByText('Delete column "email_address"? This cannot be undone.'),
    ).toBeInTheDocument();
    await userEvent.click(within(deleteDialog).getByRole("button", { name: "Delete" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(sidePanel).queryByText("email_address")).not.toBeInTheDocument();
  });
});
