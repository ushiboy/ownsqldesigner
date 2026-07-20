import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ActiveDialogProvider } from "./ActiveDialogContext";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";

// Context state is seeded per story via `parameters.notification` / `parameters.dialog`.
const withProviders: Decorator = (Story, { parameters }) => (
  <NotificationProvider initialNotification={parameters.notification ?? null}>
    <ActiveDialogProvider initialDialog={parameters.dialog ?? null}>
      <Story />
    </ActiveDialogProvider>
  </NotificationProvider>
);

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
    currentSchemaId: savedSchemas[0].id,
    tableCount: 0,
    createdDate: "2026-07-01",
    onToggleSidePanel: fn(),
    onSelectSchema: fn(),
    onCreateSchema: fn(),
    onRenameSchema: fn(),
    onDeleteSchema: fn(),
  },
  decorators: [withProviders],
} satisfies Meta<typeof MainScreenView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isSidePanelOpen: true,
  },
};

export const SidePanelClosed: Story = {
  args: {
    isSidePanelOpen: false,
  },
};

export const WithNotification: Story = {
  args: {
    isSidePanelOpen: true,
  },
  parameters: {
    notification: "Cannot delete column: referenced by a foreign key",
  },
};

export const CreateSchemaDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
  },
  parameters: {
    dialog: "createSchema",
  },
};

export const RenameSchemaDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
  },
  parameters: {
    dialog: "renameSchema",
  },
};

export const DeleteSchemaDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
  },
  parameters: {
    dialog: "deleteSchema",
  },
};
