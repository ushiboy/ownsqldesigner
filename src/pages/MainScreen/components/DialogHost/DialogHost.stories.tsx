import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { EMPTY_COLUMN_KEY_MEMBERSHIP, type Schema } from "../../../../domain/schema";
import { LocaleProvider } from "../../../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../../../test/fakeSchemaRepository";
import { ActiveDialogProvider, type DialogKind } from "../../ActiveDialogContext";
import { NotificationProvider } from "../../NotificationContext";
import { SchemaWorkspaceProvider } from "../../SchemaWorkspaceContext";
import { SelectionProvider } from "../../SelectionContext";
import { DialogHost } from "./DialogHost";

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

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

const withUsers: Schema = { ...blogSchema, tables: [usersTable] };
const withRelation: Schema = { ...blogSchema, tables: [usersTable, postsTable] };

type SeededDialogHostProps = {
  initialSchema?: Schema;
  initialDialog?: DialogKind | null;
  schemaName: string;
  selectedTable: typeof usersTable | null;
  selectedColumn: (typeof usersTable.columns)[number] | null;
  selectedKey: (typeof usersTable.keys)[number] | null;
  selectedForeignKey: (typeof postsTable.foreignKeys)[number] | null;
  selectedRelationOwnerTable: typeof postsTable | null;
  columnKeyMembership: typeof EMPTY_COLUMN_KEY_MEMBERSHIP;
  columnKeyMembershipDisabled: typeof EMPTY_COLUMN_KEY_MEMBERSHIP;
  primaryKeyDisabled: boolean;
};

// DialogHost reads the active dialog and the schema's tables from context,
// but still receives the container-derived selection values as props (that
// derivation is deferred to a later step of design doc 0011). So the seeded
// harness mounts the context providers and forwards the rest as args.
function SeededDialogHost({
  initialSchema = blogSchema,
  initialDialog,
  ...props
}: SeededDialogHostProps) {
  const [repository] = useState(() =>
    createFakeSchemaRepository({ schemas: [initialSchema], lastSchemaId: initialSchema.id }),
  );
  return (
    <LocaleProvider>
      <NotificationProvider>
        <ActiveDialogProvider initialDialog={initialDialog}>
          <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
            <SelectionProvider>
              <DialogHost {...props} />
            </SelectionProvider>
          </SchemaWorkspaceProvider>
        </ActiveDialogProvider>
      </NotificationProvider>
    </LocaleProvider>
  );
}

const meta = {
  title: "pages/MainScreen/components/DialogHost",
  component: SeededDialogHost,
  args: {
    initialSchema: blogSchema,
    initialDialog: null,
    schemaName: "Blog Schema",
    selectedTable: null,
    selectedColumn: null,
    selectedKey: null,
    selectedForeignKey: null,
    selectedRelationOwnerTable: null,
    columnKeyMembership: EMPTY_COLUMN_KEY_MEMBERSHIP,
    columnKeyMembershipDisabled: EMPTY_COLUMN_KEY_MEMBERSHIP,
    primaryKeyDisabled: false,
  },
  render: (args) => <SeededDialogHost {...args} />,
} satisfies Meta<typeof SeededDialogHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CreateSchemaDialogOpen: Story = {
  args: {
    initialDialog: "createSchema",
  },
};

export const RenameSchemaDialogOpen: Story = {
  args: {
    initialDialog: "renameSchema",
  },
};

export const DeleteSchemaDialogOpen: Story = {
  args: {
    initialDialog: "deleteSchema",
  },
};

export const CreateTableDialogOpen: Story = {
  args: {
    initialDialog: "createTable",
  },
};

export const DeleteTableDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "deleteTable",
    selectedTable: usersTable,
  },
};

export const AddColumnDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "addColumn",
    selectedTable: usersTable,
  },
};

export const EditColumnDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "editColumn",
    selectedTable: usersTable,
    selectedColumn: usersTable.columns[0],
  },
};

export const DeleteColumnDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "deleteColumn",
    selectedTable: usersTable,
    selectedColumn: usersTable.columns[0],
  },
};

export const AddKeyDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "addKey",
    selectedTable: usersTable,
  },
};

export const EditKeyDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "editKey",
    selectedTable: usersTable,
    selectedKey: usersTable.keys[0],
  },
};

export const DeleteKeyDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "deleteKey",
    selectedTable: usersTable,
    selectedKey: usersTable.keys[0],
  },
};

export const ExportSqlDialogOpen: Story = {
  args: {
    initialSchema: withUsers,
    initialDialog: "exportSql",
  },
};

export const DeleteRelationDialogOpen: Story = {
  args: {
    initialSchema: withRelation,
    initialDialog: "deleteRelation",
    selectedForeignKey: postsTable.foreignKeys[0],
    selectedRelationOwnerTable: postsTable,
  },
};
