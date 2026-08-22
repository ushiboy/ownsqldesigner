import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import type { Schema } from "../../domain/schema";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import MainScreen, { type MainScreenSeed } from "./MainScreen";

const usersTable = {
  id: "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
  name: "users",
  comment: "Registered users",
  position: { x: 0, y: 0 },
  columns: [
    {
      id: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
      name: "email",
      type: "TEXT" as const,
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: false,
      comment: "",
    },
    {
      id: "e2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      name: "id",
      type: "INTEGER" as const,
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: true,
      comment: "",
    },
  ],
  keys: [
    {
      id: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
      type: "PRIMARY_KEY" as const,
      columnIds: ["e2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d"],
    },
  ],
  foreignKeys: [],
};

const postsTable = {
  id: "e5c3fb8c-9c97-4f5e-d2cf-5f8f3d8c7b23",
  name: "posts",
  comment: "",
  position: { x: 300, y: 200 },
  columns: [
    {
      id: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      name: "user_id",
      type: "INTEGER" as const,
      size: "",
      precision: "",
      defaultValue: "",
      nullable: false,
      autoIncrement: false,
      comment: "",
    },
  ],
  keys: [],
  foreignKeys: [
    {
      id: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
      columnId: "a2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
      referencedTableId: usersTable.id,
      referencedColumnId: "e2b3c4d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d",
    },
  ],
};

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

// A second saved schema, so the toolbar's schema menu has something to
// switch to. Never the current schema in these stories.
const shopSchema: Schema = {
  id: "3f2b5c0a-88d1-4f4a-9ce6-64f19f0f9be3",
  name: "Shop Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-02T09:00:00.000Z"),
  updatedAt: new Date("2026-07-02T09:00:00.000Z"),
};

const withUsers: Schema = { ...blogSchema, tables: [usersTable] };
const withUsersLackingPrimaryKey: Schema = {
  ...blogSchema,
  tables: [{ ...usersTable, keys: [] }],
};
const withRelation: Schema = { ...blogSchema, tables: [usersTable, postsTable] };

// The view reads the schema workspace, the selection, the active dialog and
// the notification from its page, so stories seed the page rather than the
// view. Every derived value the view shows — key membership, primary-key
// availability, relation labels — is then computed the way the running app
// computes it, instead of being hand-written per story.
//
// A fresh seeded repository per mount keeps story runs isolated from each
// other while rendering fixed, deterministic data.
function SeededMainScreen({ initialSchema = blogSchema, ...seed }: MainScreenSeed) {
  const [repository] = useState(() =>
    createFakeSchemaRepository({
      schemas: [initialSchema, shopSchema],
      lastSchemaId: initialSchema.id,
    }),
  );
  return <MainScreen repository={repository} initialSchema={initialSchema} {...seed} />;
}

const meta = {
  title: "pages/MainScreen/MainScreenView",
  component: MainScreen,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    initialSchema: blogSchema,
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  render: ({ repository: _repository, ...seed }) => <SeededMainScreen {...seed} />,
} satisfies Meta<typeof MainScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SidePanelClosed: Story = {
  args: {
    initialSidePanelOpen: false,
  },
};

export const DarkTheme: Story = {
  args: {
    initialTheme: "dark",
  },
};

export const WithNotification: Story = {
  args: {
    initialNotification: "Cannot delete column: referenced by a foreign key",
  },
};

export const TableSelected: Story = {
  args: {
    initialSchema: withUsers,
    initialSelection: { tableIds: [usersTable.id] },
  },
};

export const DeleteColumnDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialSelection: { tableIds: [usersTable.id], columnId: usersTable.columns[0].id },
    initialDialog: "deleteColumn",
  },
};

export const AddColumnDialogOpenPrimaryKeyAvailable: Story = {
  args: {
    initialSchema: withUsersLackingPrimaryKey,
    initialSelection: { tableIds: [usersTable.id] },
    initialDialog: "addColumn",
  },
};

export const EditPrimaryKeyColumnDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialSelection: { tableIds: [usersTable.id], columnId: usersTable.columns[1].id },
    initialDialog: "editColumn",
  },
};

export const TableWithRelationSelected: Story = {
  args: {
    initialSchema: withRelation,
    initialSelection: { tableIds: [postsTable.id] },
  },
};

export const RelationSelected: Story = {
  args: {
    initialSchema: withRelation,
    initialSelection: { tableIds: [postsTable.id], relationId: postsTable.foreignKeys[0].id },
  },
};

export const DeleteRelationDialogOpen: Story = {
  args: {
    initialSchema: withRelation,
    initialSelection: { tableIds: [postsTable.id], relationId: postsTable.foreignKeys[0].id },
    initialDialog: "deleteRelation",
  },
};
