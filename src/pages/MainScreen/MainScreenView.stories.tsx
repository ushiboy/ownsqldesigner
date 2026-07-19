import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MainScreenView } from "./MainScreenView";

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

const meta = {
  title: "pages/MainScreen/MainScreenView",
  component: MainScreenView,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    schemaName: "Blog Schema",
    savedSchemas,
    tableCount: 0,
    createdDate: "2026-07-01",
    isSchemaNameDialogOpen: false,
    onToggleSidePanel: fn(),
    onRequestCreateSchema: fn(),
    onSubmitCreateSchema: fn(),
    onCancelCreateSchema: fn(),
  },
} satisfies Meta<typeof MainScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notificationMessage: null,
    isSidePanelOpen: true,
  },
};

export const SidePanelClosed: Story = {
  args: {
    notificationMessage: null,
    isSidePanelOpen: false,
  },
};

export const WithNotification: Story = {
  args: {
    notificationMessage: "Cannot delete column: referenced by a foreign key",
    isSidePanelOpen: true,
  },
};

export const CreateSchemaDialogOpen: Story = {
  args: {
    notificationMessage: null,
    isSidePanelOpen: true,
    isSchemaNameDialogOpen: true,
  },
};
