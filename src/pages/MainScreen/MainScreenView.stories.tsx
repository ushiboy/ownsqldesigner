import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import type { ColumnKeyMembership } from "../../domain/schema";
import { ActiveDialogProvider } from "./ActiveDialogContext";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";

const NO_KEY_MEMBERSHIP: ColumnKeyMembership = { PRIMARY_KEY: false, UNIQUE: false, INDEX: false };

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

const tables = [usersTable];
const tablesWithoutPrimaryKey = [{ ...usersTable, keys: [] }];
const tablesWithRelation = [usersTable, postsTable];

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
    tables: [],
    tableCount: 0,
    createdDate: "2026-07-01",
    selectedTableId: null,
    selectedTable: null,
    selectedColumn: null,
    selectedKey: null,
    selectedRelationId: null,
    selectedForeignKey: null,
    selectedRelationOwnerTable: null,
    relations: [],
    columnKeyMembership: NO_KEY_MEMBERSHIP,
    columnKeyMembershipDisabled: NO_KEY_MEMBERSHIP,
    primaryKeyDisabled: false,
    onToggleSidePanel: fn(),
    onSelectSchema: fn(),
    onCreateSchema: fn(),
    onRenameSchema: fn(),
    onDeleteSchema: fn(),
    onSelectTable: fn(),
    onSelectColumn: fn(),
    onSelectKey: fn(),
    onSelectRelation: fn(),
    onCreateTable: fn(),
    onUpdateTableName: fn(),
    onUpdateTableComment: fn(),
    onMoveTable: fn(),
    onRemoveTable: fn(),
    onAddColumn: fn(),
    onUpdateColumn: fn(),
    onRemoveColumn: fn(),
    onSetColumnKeyMembership: fn(),
    onAddKey: fn(),
    onUpdateKey: fn(),
    onRemoveKey: fn(),
    onAddForeignKey: fn(),
    onRemoveForeignKey: fn(),
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

export const CreateTableDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
  },
  parameters: {
    dialog: "createTable",
  },
};

export const TableSelected: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
  },
};

export const DeleteTableDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
  },
  parameters: {
    dialog: "deleteTable",
  },
};

export const AddColumnDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    columnKeyMembershipDisabled: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
  parameters: {
    dialog: "addColumn",
  },
};

export const AddColumnDialogOpenPrimaryKeyAvailable: Story = {
  args: {
    isSidePanelOpen: true,
    tables: tablesWithoutPrimaryKey,
    tableCount: tablesWithoutPrimaryKey.length,
    selectedTableId: tablesWithoutPrimaryKey[0]?.id ?? null,
    selectedTable: tablesWithoutPrimaryKey[0] ?? null,
  },
  parameters: {
    dialog: "addColumn",
  },
};

export const EditColumnDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    selectedColumn: tables[0]?.columns[0] ?? null,
    columnKeyMembershipDisabled: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
  parameters: {
    dialog: "editColumn",
  },
};

export const EditPrimaryKeyColumnDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    selectedColumn: tables[0]?.columns[1] ?? null,
    columnKeyMembership: { PRIMARY_KEY: true, UNIQUE: false, INDEX: false },
  },
  parameters: {
    dialog: "editColumn",
  },
};

export const DeleteColumnDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    selectedColumn: tables[0]?.columns[0] ?? null,
  },
  parameters: {
    dialog: "deleteColumn",
  },
};

export const AddKeyDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    primaryKeyDisabled: true,
  },
  parameters: {
    dialog: "addKey",
  },
};

export const EditKeyDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    selectedKey: tables[0]?.keys[0] ?? null,
  },
  parameters: {
    dialog: "editKey",
  },
};

export const DeleteKeyDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables,
    tableCount: tables.length,
    selectedTableId: tables[0]?.id ?? null,
    selectedTable: tables[0] ?? null,
    selectedKey: tables[0]?.keys[0] ?? null,
  },
  parameters: {
    dialog: "deleteKey",
  },
};

export const TableWithRelationSelected: Story = {
  args: {
    isSidePanelOpen: true,
    tables: tablesWithRelation,
    tableCount: tablesWithRelation.length,
    selectedTableId: postsTable.id,
    selectedTable: postsTable,
    relations: [{ id: postsTable.foreignKeys[0].id, label: "user_id → users.id" }],
  },
};

export const DeleteRelationDialogOpen: Story = {
  args: {
    isSidePanelOpen: true,
    tables: tablesWithRelation,
    tableCount: tablesWithRelation.length,
    selectedRelationId: postsTable.foreignKeys[0].id,
    selectedForeignKey: postsTable.foreignKeys[0],
    selectedRelationOwnerTable: postsTable,
  },
  parameters: {
    dialog: "deleteRelation",
  },
};
