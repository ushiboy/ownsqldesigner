import { useMemo } from "react";
import type {
  Column,
  ColumnKeyMembership,
  ForeignKey,
  Key,
  Table,
} from "../../../../domain/schema";
import { generateSqliteDdl } from "../../../../domain/sqlite/generateDdl";
import { useActiveDialog } from "../../ActiveDialogContext";
import { useSchemaActions, useTables } from "../../SchemaWorkspaceContext";
import { useSelection } from "../../SelectionContext";
import { ColumnDialog } from "../ColumnDialog";
import { ConfirmDialog } from "../ConfirmDialog";
import { ExportSqlDialog } from "../ExportSqlDialog";
import { KeyDialog } from "../KeyDialog";
import { SchemaNameDialog } from "../SchemaNameDialog";
import { describeForeignKey, describeKey } from "../SidePanel";
import { TableNameDialog } from "../TableNameDialog";

const NO_COLUMNS: Column[] = [];
const NO_NAMES: string[] = [];

type DialogHostProps = {
  schemaName: string;
  selectedTable: Table | null;
  selectedColumn: Column | null;
  selectedKey: Key | null;
  selectedForeignKey: ForeignKey | null;
  selectedRelationOwnerTable: Table | null;
  columnKeyMembership: ColumnKeyMembership;
  columnKeyMembershipDisabled: ColumnKeyMembership;
  primaryKeyDisabled: boolean;
};

export function DialogHost({
  schemaName,
  selectedTable,
  selectedColumn,
  selectedKey,
  selectedForeignKey,
  selectedRelationOwnerTable,
  columnKeyMembership,
  columnKeyMembershipDisabled,
  primaryKeyDisabled,
}: DialogHostProps) {
  const { activeDialog, closeDialog } = useActiveDialog();
  const tables = useTables();
  const { selectedTableId, selectRelation } = useSelection();
  const {
    createSchema: onCreateSchema,
    renameSchema: onRenameSchema,
    deleteCurrentSchema: onDeleteSchema,
    createTable: onCreateTable,
    removeTable: onRemoveTable,
    addColumn: onAddColumn,
    updateColumn: onUpdateColumn,
    removeColumn: onRemoveColumn,
    setColumnKeyMembership: onSetColumnKeyMembership,
    addKey: onAddKey,
    updateKey: onUpdateKey,
    removeKey: onRemoveKey,
    removeForeignKey: onRemoveForeignKey,
  } = useSchemaActions();

  // Generated only while the export dialog is open: the dialog is closed
  // for nearly every table mutation that would otherwise trigger this.
  const ddl = useMemo(
    () => (activeDialog === "exportSql" ? generateSqliteDdl(tables) : ""),
    [activeDialog, tables],
  );
  const tableNames = useMemo(() => tables.map((table) => table.name), [tables]);
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

  return (
    <>
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
    </>
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
