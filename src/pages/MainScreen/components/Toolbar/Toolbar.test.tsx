import { type ComponentProps, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import type { Schema } from "../../../../domain/schema";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { ActiveDialogProvider } from "../../ActiveDialogContext";
import { CanvasApiProvider } from "../../CanvasApiContext";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider, useSchemaActions } from "../../SchemaWorkspaceContext";
import { SelectionProvider } from "../../SelectionContext";
import { Toolbar } from "./Toolbar";
import * as stories from "./Toolbar.stories";

const { Default, SidePanelClosed, DarkTheme } = composeStories(stories);

const editableSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

/**
 * Mounts Toolbar with a hidden trigger that performs a real diagram edit.
 * Undo/Redo's enabled state depends on in-memory history, which (unlike
 * `currentSchema`) has no seed prop — see docs/design/0016-undo-redo.md —
 * so exercising it needs an actual edit rather than a story args override.
 */
function ToolbarWithEditTrigger() {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [editableSchema], lastSchemaId: editableSchema.id }),
  );
  return (
    <NotificationProvider>
      <ActiveDialogProvider>
        <SchemaWorkspaceProvider repository={repository} initialSchema={editableSchema}>
          <SelectionProvider>
            <CanvasApiProvider>
              <CreateTableTrigger />
              <Toolbar
                schemaName="Blog Schema"
                savedSchemas={[]}
                currentSchemaId={editableSchema.id}
                canDownloadSchema={false}
                onDownloadSchema={fn()}
                onSelectSchema={fn()}
                isSidePanelOpen
                onToggleSidePanel={fn()}
                theme="system"
                onCycleTheme={fn()}
              />
            </CanvasApiProvider>
          </SelectionProvider>
        </SchemaWorkspaceProvider>
      </ActiveDialogProvider>
    </NotificationProvider>
  );
}

function CreateTableTrigger() {
  const { createTable } = useSchemaActions();
  return (
    <button type="button" onClick={() => createTable("posts")}>
      Create table (test trigger)
    </button>
  );
}

/** Renders Default and opens the schema dropdown menu by clicking its trigger. */
async function openMenu(props?: Partial<ComponentProps<typeof Default>>) {
  render(<Default {...props} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Blog Schema" }));
  return user;
}

describe("Toolbar", () => {
  it("renders the schema dropdown trigger with the schema name", () => {
    render(<Default />);
    const trigger = screen.getByRole("button", { name: "Blog Schema" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("renders the schema action and editor action buttons", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Rename schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export SQL" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load JSON" })).toBeInTheDocument();
  });

  it("disables Undo and Redo when there is no history", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("enables Undo after an edit, and Redo after undoing it", async () => {
    render(<ToolbarWithEditTrigger />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create table (test trigger)" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Undo" })).toBeEnabled();
    });
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Undo" }));

    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeEnabled();
  });

  it("calls onDownloadSchema when the download button is clicked", async () => {
    const onDownloadSchema = fn();
    render(<Default onDownloadSchema={onDownloadSchema} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Download JSON" }));

    expect(onDownloadSchema).toHaveBeenCalledOnce();
  });

  it("disables the download button when canDownloadSchema is false", () => {
    render(<Default canDownloadSchema={false} />);
    expect(screen.getByRole("button", { name: "Download JSON" })).toBeDisabled();
  });

  it("does not show the schema menu before the trigger is clicked", () => {
    render(<Default />);
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
    const onSelectSchema = fn();
    const user = await openMenu({ onSelectSchema });
    await user.click(screen.getByRole("menuitem", { name: "Shop Schema" }));
    expect(onSelectSchema).toHaveBeenCalledExactlyOnceWith("3f2b5c0a-88d1-4f4a-9ce6-64f19f0f9be3");
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
    const onToggleSidePanel = fn();
    render(<Default onToggleSidePanel={onToggleSidePanel} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle side panel" }));
    expect(onToggleSidePanel).toHaveBeenCalledOnce();
  });

  it("marks the side panel toggle as pressed while the panel is open", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("marks the side panel toggle as not pressed while the panel is closed", () => {
    render(<SidePanelClosed />);
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("labels the theme button with the current theme", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Theme: system" })).toBeInTheDocument();
  });

  it("reflects a non-default theme in the button label", () => {
    render(<DarkTheme />);
    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeInTheDocument();
  });

  it("calls onCycleTheme when the theme button is clicked", async () => {
    const onCycleTheme = fn();
    render(<Default onCycleTheme={onCycleTheme} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Theme: system" }));
    expect(onCycleTheme).toHaveBeenCalledOnce();
  });
});
