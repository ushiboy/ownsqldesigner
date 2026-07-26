import { useMemo } from "react";
import { format } from "date-fns";
import type { Column, ColumnKeyMembership, ForeignKey, Key, Table } from "../../domain/schema";
import { generateSqliteDdl } from "../../domain/sqlite/generateDdl";
import { useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { ColumnDialog } from "./components/ColumnDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ExportSqlDialog } from "./components/ExportSqlDialog";
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
import {
  useCurrentSchema,
  useSavedSchemas,
  useSchemaActions,
  useTables,
} from "./SchemaWorkspaceContext";
import { useSelection } from "./SelectionContext";
import { useDeleteKeyShortcut } from "./hooks/useDeleteKeyShortcut";

const NO_COLUMNS: Column[] = [];
const NO_NAMES: string[] = [];
const NO_VALUE = "—";

type MainScreenViewProps = {
  selectedTable: Table | null;
  selectedColumn: Column | null;
  selectedKey: Key | null;
  selectedForeignKey: ForeignKey | null;
  selectedRelationOwnerTable: Table | null;
  relations: RelationSummary[];
  columnKeyMembership: ColumnKeyMembership;
  columnKeyMembershipDisabled: ColumnKeyMembership;
  primaryKeyDisabled: boolean;
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
};

export function MainScreenView({
  selectedTable,
  selectedColumn,
  selectedKey,
  selectedForeignKey,
  selectedRelationOwnerTable,
  relations,
  columnKeyMembership,
  columnKeyMembershipDisabled,
  primaryKeyDisabled,
  isSidePanelOpen,
  onToggleSidePanel,
}: MainScreenViewProps) {
  const { activeDialog, openDialog, closeDialog } = useActiveDialog();
  const currentSchema = useCurrentSchema();
  const savedSchemas = useSavedSchemas();
  const tables = useTables();
  const {
    selectedTableId,
    selectedRelationId,
    selectTable,
    selectColumn,
    selectKey,
    selectRelation,
  } = useSelection();
  const {
    createSchema: onCreateSchema,
    selectSchema: onSelectSchema,
    renameSchema: onRenameSchema,
    deleteCurrentSchema: onDeleteSchema,
    createTable: onCreateTable,
    renameTable: onUpdateTableName,
    updateTableComment: onUpdateTableComment,
    moveTable: onMoveTable,
    removeTable: onRemoveTable,
    addColumn: onAddColumn,
    updateColumn: onUpdateColumn,
    removeColumn: onRemoveColumn,
    setColumnKeyMembership: onSetColumnKeyMembership,
    addKey: onAddKey,
    updateKey: onUpdateKey,
    removeKey: onRemoveKey,
    addForeignKey: onAddForeignKey,
    removeForeignKey: onRemoveForeignKey,
  } = useSchemaActions();

  const schemaName = currentSchema?.name ?? NO_VALUE;
  const createdDate =
    currentSchema === null ? NO_VALUE : format(currentSchema.createdAt, "yyyy-MM-dd");
  // Generated only while the export dialog is open: the dialog is closed
  // for nearly every table mutation that would otherwise trigger this.
  const ddl = useMemo(
    () => (activeDialog === "exportSql" ? generateSqliteDdl(tables) : ""),
    [activeDialog, tables],
  );
  const tableNames = useMemo(() => tables.map((table) => table.name), [tables]);
  const siblingTableNames = useMemo(
    () => tables.filter((table) => table.id !== selectedTableId).map((table) => table.name),
    [tables, selectedTableId],
  );
  const columnNames = useMemo(
    () => selectedTable?.columns.map((column) => column.name) ?? NO_NAMES,
    [selectedTable],
  );
  const siblingColumnNames = useMemo(
    () =>
      selectedTable?.columns
        .filter((column) => column.id !== selectedColumn?.id)
        .map((column) => column.name) ?? NO_NAMES,
    [selectedTable, selectedColumn],
  );

  useDeleteKeyShortcut({ tableId: selectedTableId, relationId: selectedRelationId });

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar
        schemaName={schemaName}
        savedSchemas={savedSchemas}
        currentSchemaId={currentSchema?.id ?? null}
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
            onSelectTable={selectTable}
            onSelectRelation={selectRelation}
            onMoveTable={onMoveTable}
            onAddForeignKey={onAddForeignKey}
          />
        </main>
        <SidePanel
          isOpen={isSidePanelOpen}
          schemaName={schemaName}
          tableCount={tables.length}
          createdDate={createdDate}
          selectedTable={selectedTable}
          existingTableNames={siblingTableNames}
          relations={relations}
          onUpdateTableName={onUpdateTableName}
          onUpdateTableComment={onUpdateTableComment}
          onDeleteTable={() => openDialog("deleteTable")}
          onAddColumn={() => {
            selectColumn(null);
            openDialog("addColumn");
          }}
          onEditColumn={(columnId) => {
            selectColumn(columnId);
            openDialog("editColumn");
          }}
          onDeleteColumn={(columnId) => {
            selectColumn(columnId);
            openDialog("deleteColumn");
          }}
          onAddKey={() => {
            selectKey(null);
            openDialog("addKey");
          }}
          onEditKey={(keyId) => {
            selectKey(keyId);
            openDialog("editKey");
          }}
          onDeleteKey={(keyId) => {
            selectKey(keyId);
            openDialog("deleteKey");
          }}
          onDeleteRelation={(relationId) => {
            selectRelation(relationId);
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
        existingNames={tableNames}
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
        existingNames={columnNames}
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
        existingNames={siblingColumnNames}
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
          selectRelation(null);
          closeDialog();
        }}
        onCancel={() => {
          selectRelation(null);
          closeDialog();
        }}
      />
      <ExportSqlDialog
        open={activeDialog === "exportSql"}
        ddl={ddl}
        schemaName={schemaName}
        onClose={closeDialog}
      />
    </div>
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
