import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Toolbar.stories";

const { Default, SidePanelClosed } = composeStories(stories);

/** Runs Default and opens the schema dropdown menu by clicking its trigger. */
async function openMenu() {
  await Default.run();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Blog Schema" }));
  return user;
}

describe("Toolbar", () => {
  it("renders the schema dropdown trigger with the schema name", async () => {
    await Default.run();
    const trigger = screen.getByRole("button", { name: "Blog Schema" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the schema action and editor action buttons", async () => {
    await Default.run();
    expect(screen.getByRole("button", { name: "Rename schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export SQL" })).toBeInTheDocument();
  });

  it("does not show the schema menu before the trigger is clicked", async () => {
    await Default.run();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens the schema menu listing saved schemas as selectable items", async () => {
    await openMenu();
    expect(screen.getByRole("menu", { name: "Schemas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blog Schema" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Shop Schema" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "+ New Schema" })).toBeEnabled();
  });

  it("marks only the current schema in the menu", async () => {
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Blog Schema" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "Shop Schema" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("calls onSelectSchema with the id and closes the menu when a schema is clicked", async () => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Shop Schema" }));
    expect(Default.args.onSelectSchema).toHaveBeenCalledExactlyOnceWith(
      "3f2b5c0a-88d1-4f4a-9ce6-64f19f0f9be3",
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when + New Schema is clicked", async () => {
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "+ New Schema" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when Escape is pressed", async () => {
    const user = await openMenu();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the menu when clicking outside of it", async () => {
    const user = await openMenu();
    await user.click(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onToggleSidePanel when the side panel toggle is clicked", async () => {
    await Default.run();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle side panel" }));
    expect(Default.args.onToggleSidePanel).toHaveBeenCalledOnce();
  });

  it("marks the side panel toggle as pressed while the panel is open", async () => {
    await Default.run();
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("marks the side panel toggle as not pressed while the panel is closed", async () => {
    await SidePanelClosed.run();
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
