import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import type { Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleProvider";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { ActiveDialogProvider } from "../../ActiveDialogContext";
import { CanvasApiProvider } from "../../CanvasApiContext";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider } from "../../SchemaWorkspaceContext";
import { SelectionProvider } from "../../SelectionContext";
import { Toolbar } from "./Toolbar";

const savedSchemas = [
  {
    id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
    name: "Blog Schema",
    updatedAt: new Date("2026-07-01T09:00:00.000Z"),
  },
  {
    id: "3f2b5c0a-88d1-4f4a-9ce6-64f19f0f9be3",
    name: "Shop Schema",
    updatedAt: new Date("2026-07-02T09:00:00.000Z"),
  },
];

const currentSchema: Schema = {
  id: savedSchemas[0].id,
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: savedSchemas[0].updatedAt,
};

// A stable fake repository, so LoadSchemaButton's context providers don't
// see a new repository identity on every re-render.
function ToolbarWithProviders(props: ComponentProps<typeof Toolbar>) {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [currentSchema], lastSchemaId: currentSchema.id }),
  );
  return (
    <LocaleProvider>
      <NotificationProvider>
        <ActiveDialogProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={currentSchema}>
            <SelectionProvider>
              <CanvasApiProvider>
                <Toolbar {...props} />
              </CanvasApiProvider>
            </SelectionProvider>
          </SchemaWorkspaceProvider>
        </ActiveDialogProvider>
      </NotificationProvider>
    </LocaleProvider>
  );
}

const meta = {
  title: "pages/MainScreen/Toolbar",
  component: ToolbarWithProviders,
  args: {
    savedSchemas,
    currentSchemaId: savedSchemas[0].id,
    canDownloadSchema: true,
    onDownloadSchema: fn(),
    onSelectSchema: fn(),
    onToggleSidePanel: fn(),
    onCycleTheme: fn(),
  },
} satisfies Meta<typeof ToolbarWithProviders>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: true,
    theme: "system",
  },
};

export const SidePanelClosed: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: false,
    theme: "system",
  },
};

export const DarkTheme: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: true,
    theme: "dark",
  },
};
