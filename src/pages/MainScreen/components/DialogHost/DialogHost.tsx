import { useMemo } from "react";
import { useTranslations } from "use-intl";
import {
  hasPrimaryKey,
  type Column,
  type ColumnKeyMembership,
  type ForeignKey,
  type Key,
  type Table,
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
  const tCommon = useTranslations("common");
  const tSchema = useTranslations("schemaDialog");
  const tTable = useTranslations("tableDialog");
  const tColumn = useTranslations("columnDialog");
  const tKey = useTranslations("keyDialog");
  const tRelation = useTranslations("relationDialog");
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
  // Same "only while the export dialog is open" scoping as `ddl` above.
  const tablesWithoutPrimaryKey = useMemo(
    () =>
      activeDialog === "exportSql"
        ? tables.filter((table) => !hasPrimaryKey(table)).map((table) => table.name)
        : NO_NAMES,
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
        title={tSchema("newTitle")}
        submitLabel={tCommon("create")}
        onSubmit={(name) => {
          onCreateSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <SchemaNameDialog
        open={activeDialog === "renameSchema"}
        title={tSchema("renameTitle")}
        submitLabel={tCommon("rename")}
        initialName={schemaName}
        onSubmit={(name) => {
          onRenameSchema(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteSchema"}
        title={tSchema("deleteTitle")}
        message={tSchema("deleteConfirmMessage", { name: schemaName })}
        confirmLabel={tCommon("delete")}
        onConfirm={() => {
          onDeleteSchema();
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <TableNameDialog
        open={activeDialog === "createTable"}
        title={tTable("newTitle")}
        submitLabel={tCommon("create")}
        existingNames={tableNames}
        onSubmit={(name) => {
          onCreateTable(name);
          closeDialog();
        }}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={activeDialog === "deleteTable"}
        title={tTable("deleteTitle")}
        message={tTable("deleteConfirmMessage", { name: selectedTable?.name ?? "" })}
        confirmLabel={tCommon("delete")}
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
        title={tColumn("addTitle")}
        submitLabel={tCommon("add")}
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
        title={tColumn("editTitle")}
        submitLabel={tCommon("save")}
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
        title={tColumn("deleteTitle")}
        message={tColumn("deleteConfirmMessage", { name: selectedColumn?.name ?? "" })}
        confirmLabel={tCommon("delete")}
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
        title={tKey("addTitle")}
        submitLabel={tCommon("add")}
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
        title={tKey("editTitle")}
        submitLabel={tCommon("save")}
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
        title={tKey("deleteTitle")}
        message={tKey("deleteConfirmMessage", {
          label:
            selectedKey !== null
              ? describeKey(selectedKey, selectedTable?.columns ?? NO_COLUMNS)
              : "",
        })}
        confirmLabel={tCommon("delete")}
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
        title={tRelation("deleteTitle")}
        message={tRelation("deleteConfirmMessage", {
          label: describeDeleteRelationLabel(
            tables,
            selectedForeignKey,
            selectedRelationOwnerTable,
          ),
        })}
        confirmLabel={tCommon("delete")}
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
        tablesWithoutPrimaryKey={tablesWithoutPrimaryKey}
        schemaName={schemaName}
        onClose={closeDialog}
      />
    </>
  );
}

function describeDeleteRelationLabel(
  tables: Table[],
  selectedForeignKey: ForeignKey | null,
  selectedRelationOwnerTable: Table | null,
): string {
  return selectedForeignKey !== null && selectedRelationOwnerTable !== null
    ? describeForeignKey(
        selectedForeignKey,
        selectedRelationOwnerTable.columns,
        tables.find((table) => table.id === selectedForeignKey.referencedTableId),
      )
    : "";
}
