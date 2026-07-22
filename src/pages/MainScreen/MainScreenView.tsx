import type { Column, Position, SchemaSummary, Table } from "../../domain/schema";
import { useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { ColumnDialog } from "./components/ColumnDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { NotificationBar } from "./components/NotificationBar";
import { SchemaNameDialog } from "./components/SchemaNameDialog";
import { SidePanel } from "./components/SidePanel";
import { TableNameDialog } from "./components/TableNameDialog";
import { Toolbar } from "./components/Toolbar";

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
  isSidePanelOpen: boolean;
  onToggleSidePanel: () => void;
  onSelectSchema: (id: string) => void;
  onCreateSchema: (name: string) => void;
  onRenameSchema: (name: string) => void;
  onDeleteSchema: () => void;
  onSelectTable: (id: string | null) => void;
  onSelectColumn: (id: string | null) => void;
  onCreateTable: (name: string) => void;
  onUpdateTableName: (tableId: string, name: string) => void;
  onUpdateTableComment: (tableId: string, comment: string) => void;
  onMoveTable: (tableId: string, position: Position) => void;
  onAddColumn: (tableId: string, fields: Omit<Column, "id">) => void;
  onUpdateColumn: (tableId: string, columnId: string, fields: Omit<Column, "id">) => void;
  onRemoveColumn: (tableId: string, columnId: string) => void;
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
  isSidePanelOpen,
  onToggleSidePanel,
  onSelectSchema,
  onCreateSchema,
  onRenameSchema,
  onDeleteSchema,
  onSelectTable,
  onSelectColumn,
  onCreateTable,
  onUpdateTableName,
  onUpdateTableComment,
  onMoveTable,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
}: MainScreenViewProps) {
  const { activeDialog, openDialog, closeDialog } = useActiveDialog();

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
      <ColumnDialog
        open={activeDialog === "addColumn"}
        title="Add Column"
        submitLabel="Add"
        onSubmit={(fields) => {
          if (selectedTableId !== null) {
            onAddColumn(selectedTableId, fields);
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
        onSubmit={(fields) => {
          if (selectedTableId !== null && selectedColumn !== null) {
            onUpdateColumn(selectedTableId, selectedColumn.id, fields);
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
    </div>
  );
}
