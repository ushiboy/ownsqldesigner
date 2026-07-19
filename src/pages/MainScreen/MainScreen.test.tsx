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
});
