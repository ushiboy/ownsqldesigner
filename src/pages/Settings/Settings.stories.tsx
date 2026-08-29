import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import Settings from "./Settings";

const meta = {
  title: "pages/Settings",
  component: Settings,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TableIdPattern: Story = {
  args: { initialFkNamingPattern: "tableId" },
};

export const WithDefaultColumnTemplates: Story = {
  args: {
    initialDefaultColumnTemplates: {
      sqlite: [
        {
          id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
          name: "id",
          type: "INTEGER",
          size: "",
          precision: "",
          defaultValue: "",
          nullable: false,
          autoIncrement: true,
          comment: "",
          keyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
        },
      ],
    },
  },
};
