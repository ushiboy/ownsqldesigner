import { useEffect } from "react";
import type {
  Column,
  ColumnKeyMembership,
  ForeignKey,
  Key,
  Position,
  SchemaSummary,
  Table,
} from "../../domain/schema";
import { type DialogKind, useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { ColumnDialog } from "./components/ColumnDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { KeyDialog } from "./components/KeyDialog";
import { NotificationBar } from "./components/NotificationBar";
import { SchemaNameDialog } from "./components/SchemaNameDialog";
import {
  describeForeignKey,
  describeKey,
  type RelationSummary,
  SidePanel,
} from "./components/SidePanel";
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
  selectedRelationId: string | null;
  selectedForeignKey: ForeignKey | null;
  selectedRelationOwnerTable: Table | null;
  relations: RelationSummary[];
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
  onSelectRelation: (id: string | null) => void;
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
  onAddForeignKey: (tableId: string, fields: Omit<ForeignKey, "id">) => void;
  onRemoveForeignKey: (tableId: string, foreignKeyId: string) => void;
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
  selectedRelationId,
  selectedForeignKey,
  selectedRelationOwnerTable,
  relations,
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
  onSelectRelation,
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
  onAddForeignKey,
  onRemoveForeignKey,
}: MainScreenViewProps) {
  const { activeDialog, openDialog, closeDialog } = useActiveDialog();

  // Delete/Backspace opens the same confirm dialog as the side panel's
  // delete button, rather than deleting immediately — every destructive
  // action in this app is confirmation-gated, and keyboard delete is no
  // exception. Ignored while a dialog is already open or focus is in a
  // text field, so it doesn't interfere with typing. Relation and table
  // selection are mutually exclusive (see MainScreen), so which dialog to
  // open is unambiguous.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreKeyboardDelete(activeDialog, selectedTableId, selectedRelationId)) {
        return;
      }
      if (isTextInputElement(document.activeElement)) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        openDialog(selectedRelationId !== null ? "deleteRelation" : "deleteTable");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDialog, selectedTableId, selectedRelationId, openDialog]);

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
            selectedRelationId={selectedRelationId}
            onSelectTable={onSelectTable}
            onSelectRelation={onSelectRelation}
            onMoveTable={onMoveTable}
            onAddForeignKey={onAddForeignKey}
          />
        </main>
        <SidePanel
          isOpen={isSidePanelOpen}
          schemaName={schemaName}
          tableCount={tableCount}
          createdDate={createdDate}
          selectedTable={selectedTable}
          relations={relations}
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
          onDeleteRelation={(relationId) => {
            onSelectRelation(relationId);
            openDialog("deleteRelation");
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
      <ConfirmDialog
        open={activeDialog === "deleteRelation"}
        title="Delete Relation"
        message={describeDeleteRelationMessage(
          tables,
          selectedForeignKey,
          selectedRelationOwnerTable,
        )}
        confirmLabel="Delete"
        onConfirm={() => {
          if (selectedRelationOwnerTable !== null && selectedForeignKey !== null) {
            onRemoveForeignKey(selectedRelationOwnerTable.id, selectedForeignKey.id);
          }
          // Reset selection so a subsequent Delete keypress doesn't reopen
          // this same (now stale) relation's dialog instead of acting on
          // whatever table is still selected on the canvas.
          onSelectRelation(null);
          closeDialog();
        }}
        onCancel={() => {
          onSelectRelation(null);
          closeDialog();
        }}
      />
    </div>
  );
}

function shouldIgnoreKeyboardDelete(
  activeDialog: DialogKind | null,
  selectedTableId: string | null,
  selectedRelationId: string | null,
): boolean {
  return activeDialog !== null || (selectedTableId === null && selectedRelationId === null);
}

function isTextInputElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function describeDeleteRelationMessage(
  tables: Table[],
  selectedForeignKey: ForeignKey | null,
  selectedRelationOwnerTable: Table | null,
): string {
  const label =
    selectedForeignKey !== null && selectedRelationOwnerTable !== null
      ? describeForeignKey(
          selectedForeignKey,
          selectedRelationOwnerTable.columns,
          tables.find((table) => table.id === selectedForeignKey.referencedTableId),
        )
      : "";
  return `Delete relation "${label}"? This cannot be undone.`;
}
