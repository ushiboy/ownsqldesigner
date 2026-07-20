import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ActiveDialogProvider } from "../../ActiveDialogContext";
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

const meta = {
  title: "pages/MainScreen/Toolbar",
  component: Toolbar,
  args: {
    savedSchemas,
    currentSchemaId: savedSchemas[0].id,
    onSelectSchema: fn(),
    onToggleSidePanel: fn(),
  },
  decorators: [
    (Story) => (
      <ActiveDialogProvider>
        <Story />
      </ActiveDialogProvider>
    ),
  ],
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: true,
  },
};

export const SidePanelClosed: Story = {
  args: {
    schemaName: "Blog Schema",
    isSidePanelOpen: false,
  },
};
