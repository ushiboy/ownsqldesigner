import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import type { Schema } from "../../domain/schema";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import MainScreen from "./MainScreen";

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

const shopSchema: Schema = {
  id: "3f2b5c0a-88d1-4f4a-9ce6-64f19f0f9be3",
  name: "Shop Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-02T09:00:00.000Z"),
  updatedAt: new Date("2026-07-02T09:00:00.000Z"),
};

// A fresh seeded repository per mount keeps story runs isolated from each
// other while rendering fixed, deterministic data.
function SeededMainScreen() {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [blogSchema, shopSchema], lastSchemaId: blogSchema.id }),
  );
  return <MainScreen repository={repository} />;
}

const meta = {
  title: "pages/MainScreen",
  component: MainScreen,
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
  render: () => <SeededMainScreen />,
} satisfies Meta<typeof MainScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
