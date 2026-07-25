import { useEffect } from "react";
import type {
  Column,
  ColumnKeyMembership,
  Key,
  Position,
  SchemaSummary,
  Table,
} from "../../domain/schema";
import { useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { ColumnDialog } from "./components/ColumnDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyDialog } from "./components/KeyDialog";
import { NotificationBar } from "./components/NotificationBar";
import { SchemaNameDialog } from "./components/SchemaNameDialog";
import { describeKey, SidePanel } from "./components/SidePanel";
import { TableNameDialog } from "./components/TableNameDialog";
import { Toolbar } from "./components/Toolbar";

const NO_COLUMNS: Column[] = [];

type MainScreenViewProps = {
  schemaName: string;
  savedSchemas: SchemaSummary[];
  currentSchemaId: string | null;
  tables: Table[];
  tableCount: number;
  createdDate: string;
  selectedTableId: string | null;
  selectedTable: Table | null;
  selectedColumn: Column | null;
  selectedKey: Key | null;
  columnKeyMembership: ColumnKeyMembership;
  columnKeyMembershipDisabled: ColumnKeyMembership;
  primaryKeyDisabled: boolean;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onSelectSchema: (id: string) => void;
  onCreateSchema: (name: string) => void;
  onRenameSchema: (name: string) => void;
  onDeleteSchema: () => void;
  onSelectTable: (id: string | null) => void;
  onSelectColumn: (id: string | null) => void;
  onSelectKey: (id: string | null) => void;
  onCreateTable: (name: string) => void;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onMoveTable: (tableId: string, position: Position) => void;
  onRemoveTable: (tableId: string) => void;
  onAddColumn: (tableId: string, fields: Omit<Column, "id">, id?: string) => void;
  onUpdateColumn: (tableId: string, columnId: string, fields: Omit<Column, "id">) => void;
  onRemoveColumn: (tableId: string, columnId: string) => void;
  onSetColumnKeyMembership: (
    tableId: string,
    columnId: string,
    membership: ColumnKeyMembership,
  ) => void;
  onAddKey: (tableId: string, fields: Omit<Key, "id">) => void;
  onUpdateKey: (tableId: string, keyId: string, fields: Omit<Key, "id">) => void;
  onRemoveKey: (tableId: string, keyId: string) => void;
};

export function MainScreenView({
  schemaName,
  savedSchemas,
  currentSchemaId,
  tables,
  tableCount,
  createdDate,
  selectedTableId,
  selectedTable,
  selectedColumn,
  selectedKey,
  columnKeyMembership,
  columnKeyMembershipDisabled,
  primaryKeyDisabled,
  isSidePanelOpen,
  onToggleSidePanel,
  onSelectSchema,
  onCreateSchema,
  onRenameSchema,
  onDeleteSchema,
  onSelectTable,
  onSelectColumn,
  onSelectKey,
  onCreateTable,
  onUpdateTableName,
  onUpdateTableComment,
  onMoveTable,
  onRemoveTable,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  onSetColumnKeyMembership,
  onAddKey,
  onUpdateKey,
  onRemoveKey,
}: MainScreenViewProps) {
  const { activeDialog, openDialog, closeDialog } = useActiveDialog();

  // Delete/Backspace opens the same confirm dialog as the side panel's
  // delete button, rather than deleting immediately — every destructive
  // action in this app is confirmation-gated, and keyboard delete is no
  // exception. Ignored while a dialog is already open or focus is in a
  // text field, so it doesn't interfere with typing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (activeDialog !== null || selectedTableId === null) {
        return;
      }
      if (isTextInputElement(document.activeElement)) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        openDialog("deleteTable");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, selectedTableId, openDialog]);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar
        schemaName={schemaName}
        savedSchemas={savedSchemas}
        currentSchemaId={currentSchemaId}
        onSelectSchema={onSelectSchema}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={onToggleSidePanel}
      />
      <div className="flex min-h-0 flex-1">
        <main aria-label="Canvas" className="relative min-w-0 flex-1">
          <NotificationBar />
          <Canvas
            tables={tables}
            selectedTableId={selectedTableId}
            onSelectTable={onSelectTable}
            onMoveTable={onMoveTable}
          />
        </main>
        <SidePanel
          isOpen={isSidePanelOpen}
          schemaName={schemaName}
          tableCount={tableCount}
          createdDate={createdDate}
          selectedTable={selectedTable}
          onUpdateTableName={onUpdateTableName}
          onUpdateTableComment={onUpdateTableComment}
          onDeleteTable={() => openDialog("deleteTable")}
          onAddColumn={() => {
            onSelectColumn(null);
            openDialog("addColumn");
          }}
          onEditColumn={(columnId) => {
            onSelectColumn(columnId);
            openDialog("editColumn");
          }}
          onDeleteColumn={(columnId) => {
            onSelectColumn(columnId);
            openDialog("deleteColumn");
          }}
          onAddKey={() => {
            onSelectKey(null);
            openDialog("addKey");
          }}
          onEditKey={(keyId) => {
            onSelectKey(keyId);
            openDialog("editKey");
          }}
          onDeleteKey={(keyId) => {
            onSelectKey(keyId);
            openDialog("deleteKey");
          }}
        />
      </div>
      <SchemaNameDialog
        open={activeDialog === "createSchema"}
        title="New Schema"
        submitLabel="Create"
        onSubmit={(name) => {
          onCreateSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <SchemaNameDialog
        open={activeDialog === "renameSchema"}
        title="Rename Schema"
        submitLabel="Rename"
        initialName={schemaName}
        onSubmit={(name) => {
          onRenameSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteSchema"}
        title="Delete Schema"
        message={`Delete "${schemaName}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          onDeleteSchema();
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <TableNameDialog
        open={activeDialog === "createTable"}
        title="New Table"
        submitLabel="Create"
        onSubmit={(name) => {
          onCreateTable(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteTable"}
        title="Delete Table"
        message={`Delete "${selectedTable?.name ?? ""}"? All its columns and keys will be removed too. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (selectedTableId !== null) {
            onRemoveTable(selectedTableId);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ColumnDialog
        open={activeDialog === "addColumn"}
        title="Add Column"
        submitLabel="Add"
        keyMembership={columnKeyMembership}
        keyMembershipDisabled={columnKeyMembershipDisabled}
        onSubmit={(fields, keyMembership) => {
          if (selectedTableId !== null) {
            // Generated here (rather than left to addColumn's default) so the
            // same-submit key membership can reference this exact column id.
            const columnId = crypto.randomUUID();
            onAddColumn(selectedTableId, fields, columnId);
            onSetColumnKeyMembership(selectedTableId, columnId, keyMembership);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ColumnDialog
        open={activeDialog === "editColumn"}
        title="Edit Column"
        submitLabel="Save"
        initialColumn={selectedColumn}
        keyMembership={columnKeyMembership}
        keyMembershipDisabled={columnKeyMembershipDisabled}
        onSubmit={(fields, keyMembership) => {
          if (selectedTableId !== null && selectedColumn !== null) {
            onUpdateColumn(selectedTableId, selectedColumn.id, fields);
            onSetColumnKeyMembership(selectedTableId, selectedColumn.id, keyMembership);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteColumn"}
        title="Delete Column"
        message={`Delete column "${selectedColumn?.name ?? ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (selectedTableId !== null && selectedColumn !== null) {
            onRemoveColumn(selectedTableId, selectedColumn.id);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <KeyDialog
        open={activeDialog === "addKey"}
        title="Add Key"
        submitLabel="Add"
        columns={selectedTable?.columns ?? NO_COLUMNS}
        primaryKeyDisabled={primaryKeyDisabled}
        onSubmit={(fields) => {
          if (selectedTableId !== null) {
            onAddKey(selectedTableId, fields);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <KeyDialog
        open={activeDialog === "editKey"}
        title="Edit Key"
        submitLabel="Save"
        columns={selectedTable?.columns ?? NO_COLUMNS}
        initialKey={selectedKey}
        primaryKeyDisabled={primaryKeyDisabled}
        onSubmit={(fields) => {
          if (selectedTableId !== null && selectedKey !== null) {
            onUpdateKey(selectedTableId, selectedKey.id, fields);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteKey"}
        title="Delete Key"
        message={`Delete key "${selectedKey !== null ? describeKey(selectedKey, selectedTable?.columns ?? NO_COLUMNS) : ""}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (selectedTableId !== null && selectedKey !== null) {
            onRemoveKey(selectedTableId, selectedKey.id);
          }
          closeDialog();
        }}
        onCancel={closeDialog}
      />
    </div>
  );
}

function isTextInputElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}
