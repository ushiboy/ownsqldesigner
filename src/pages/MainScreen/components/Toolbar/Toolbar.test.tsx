import { type ComponentProps, useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import type { Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { ActiveDialogProvider } from "../../ActiveDialogContext";
import { CanvasApiProvider, useCanvasApiRef } from "../../CanvasApiContext";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider, useSchemaActions } from "../../SchemaWorkspaceContext";
import { SelectionProvider } from "../../SelectionContext";
import { Toolbar } from "./Toolbar";
import * as stories from "./Toolbar.stories";

const { Default, SidePanelClosed, DarkTheme, ColumnDetailsHidden, SnapToGridEnabled } =
  composeStories(stories);

const editableSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
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
    <MemoryRouter>
      <LocaleProvider>
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
                    showColumnDetails
                    onToggleColumnDetails={fn()}
                    snapToGrid={false}
                    onToggleSnapToGrid={fn()}
                  />
                </CanvasApiProvider>
              </SelectionProvider>
            </SchemaWorkspaceProvider>
          </ActiveDialogProvider>
        </NotificationProvider>
      </LocaleProvider>
    </MemoryRouter>
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

/**
 * Mounts Toolbar with a mocked CanvasApi so clicking the auto-align button
 * can be asserted without a real React Flow canvas (see Canvas.tsx's
 * CanvasApiBridge, which registers the real implementation).
 */
function ToolbarWithMockedCanvasApi({ autoAlignTables }: { autoAlignTables: () => void }) {
  return (
    <MemoryRouter>
      <LocaleProvider>
        <NotificationProvider>
          <ActiveDialogProvider>
            <SchemaWorkspaceProvider
              repository={createFakeSchemaRepository({
                schemas: [editableSchema],
                lastSchemaId: editableSchema.id,
              })}
              initialSchema={editableSchema}
            >
              <SelectionProvider>
                <CanvasApiProvider>
                  <CanvasApiSpy autoAlignTables={autoAlignTables} />
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
                    showColumnDetails
                    onToggleColumnDetails={fn()}
                    snapToGrid={false}
                    onToggleSnapToGrid={fn()}
                  />
                </CanvasApiProvider>
              </SelectionProvider>
            </SchemaWorkspaceProvider>
          </ActiveDialogProvider>
        </NotificationProvider>
      </LocaleProvider>
    </MemoryRouter>
  );
}

function CanvasApiSpy({ autoAlignTables }: { autoAlignTables: () => void }) {
  const canvasApiRef = useCanvasApiRef();
  useEffect(() => {
    canvasApiRef.current = { deselectAllTables: () => {}, autoAlignTables };
    return () => {
      canvasApiRef.current = null;
    };
  }, [canvasApiRef, autoAlignTables]);
  return null;
}

/** Renders Default and opens the schema dropdown menu by clicking its trigger. */
async function openMenu(props?: Partial<ComponentProps<typeof Default>>) {
  render(<Default {...props} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Blog Schema" }));
  return user;
}

describe("Toolbar", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it("renders a link to the settings page", () => {
    render(<Default />);
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
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

  it("calls onToggleColumnDetails when the column details toggle is clicked", async () => {
    const onToggleColumnDetails = fn();
    render(<Default onToggleColumnDetails={onToggleColumnDetails} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle column type/size" }));
    expect(onToggleColumnDetails).toHaveBeenCalledOnce();
  });

  it("marks the column details toggle as pressed while details are shown", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Toggle column type/size" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("marks the column details toggle as not pressed while details are hidden", () => {
    render(<ColumnDetailsHidden />);
    expect(screen.getByRole("button", { name: "Toggle column type/size" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onToggleSnapToGrid when the snap to grid toggle is clicked", async () => {
    const onToggleSnapToGrid = fn();
    render(<Default onToggleSnapToGrid={onToggleSnapToGrid} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle snap to grid" }));
    expect(onToggleSnapToGrid).toHaveBeenCalledOnce();
  });

  it("marks the snap to grid toggle as not pressed while snapping is disabled", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Toggle snap to grid" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks the snap to grid toggle as pressed while snapping is enabled", () => {
    render(<SnapToGridEnabled />);
    expect(screen.getByRole("button", { name: "Toggle snap to grid" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders the auto-align button", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Auto-align tables" })).toBeInTheDocument();
  });

  it("calls the canvas's autoAlignTables through CanvasApiContext when clicked", async () => {
    const autoAlignTables = fn();
    render(<ToolbarWithMockedCanvasApi autoAlignTables={autoAlignTables} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Auto-align tables" }));

    expect(autoAlignTables).toHaveBeenCalledOnce();
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

  it("labels the locale button with the current language", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: "Language: en" })).toBeInTheDocument();
  });

  it("does not show the locale menu before the trigger is clicked", () => {
    render(<Default />);
    expect(screen.queryByRole("menu", { name: "Languages" })).not.toBeInTheDocument();
  });

  it("opens the locale menu listing the available languages", async () => {
    render(<Default />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Language: en" }));

    expect(screen.getByRole("menu", { name: "Languages" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "English" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "日本語" })).toBeEnabled();
  });

  it("marks only the current language in the locale menu", async () => {
    render(<Default />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Language: en" }));

    expect(screen.getByRole("menuitem", { name: "English" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: "日本語" })).not.toHaveAttribute("aria-current");
  });

  it("switches the UI language and closes the menu when a language is selected", async () => {
    render(<Default />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Language: en" }));
    await user.click(screen.getByRole("menuitem", { name: "日本語" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "言語: ja" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "スキーマ名を変更" })).toBeInTheDocument();
  });

  it("closes the locale menu when Escape is pressed", async () => {
    render(<Default />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Language: en" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes the locale menu when clicking outside of it", async () => {
    render(<Default />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Language: en" }));
    await user.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
