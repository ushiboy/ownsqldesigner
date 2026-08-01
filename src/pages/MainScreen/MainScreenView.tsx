import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { Column, ColumnKeyMembership, ForeignKey, Key, Table } from "../../domain/schema";
import { useActiveDialog } from "./ActiveDialogContext";
import { Canvas } from "./components/Canvas";
import { DialogHost } from "./components/DialogHost";
import { NotificationBar } from "./components/NotificationBar";
import { SidePanel, type RelationSummary } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";
import {
  useCurrentSchema,
  useHasUnsavedChanges,
  useSavedSchemas,
  useSchemaActions,
  useTables,
} from "./SchemaWorkspaceContext";
import { useSelection } from "./SelectionContext";
import { useDeleteKeyShortcut } from "./hooks/useDeleteKeyShortcut";
import { useDownloadSchemaFile } from "./hooks/useDownloadSchemaFile";
import { useUndoRedoShortcut } from "./hooks/useUndoRedoShortcut";
import { useUnsavedChangesWarning } from "./hooks/useUnsavedChangesWarning";

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
  const { openDialog } = useActiveDialog();
  const currentSchema = useCurrentSchema();
  const savedSchemas = useSavedSchemas();
  const hasUnsavedChanges = useHasUnsavedChanges();
  const tables = useTables();
  const {
    selectedTableId,
    selectedTableIds,
    selectedRelationId,
    setTableSelection,
    selectColumn,
    selectKey,
    selectRelation,
  } = useSelection();
  // Captured once: Canvas only reads this for its very first render (see
  // the comment on its `useNodesState` call), so a stable snapshot avoids
  // handing it a new array on every render for no benefit.
  const [initialSelectedTableIds] = useState(() => [...selectedTableIds]);
  const {
    selectSchema: onSelectSchema,
    renameTable: onUpdateTableName,
    updateTableComment: onUpdateTableComment,
    moveTables: onMoveTables,
    addForeignKey: onAddForeignKey,
    addForeignKeyWithNewColumn: onAddForeignKeyWithNewColumn,
  } = useSchemaActions();
  const { canDownload: canDownloadSchema, downloadSchemaFile: onDownloadSchema } =
    useDownloadSchemaFile();

  const schemaName = currentSchema?.name ?? NO_VALUE;
  const createdDate =
    currentSchema === null ? NO_VALUE : format(currentSchema.createdAt, "yyyy-MM-dd");
  const siblingTableNames = useMemo(
    () => tables.filter((table) => table.id !== selectedTableId).map((table) => table.name),
    [tables, selectedTableId],
  );

  useDeleteKeyShortcut({ tableId: selectedTableId, relationId: selectedRelationId });
  useUndoRedoShortcut();
  useUnsavedChangesWarning(hasUnsavedChanges);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <Toolbar
        schemaName={schemaName}
        savedSchemas={savedSchemas}
        currentSchemaId={currentSchema?.id ?? null}
        canDownloadSchema={canDownloadSchema}
        onDownloadSchema={onDownloadSchema}
        onSelectSchema={onSelectSchema}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={onToggleSidePanel}
      />
      <div className="flex min-h-0 flex-1">
        <main aria-label="Canvas" className="relative min-w-0 flex-1">
          <NotificationBar />
          <Canvas
            tables={tables}
            selectedRelationId={selectedRelationId}
            initialSelectedTableIds={initialSelectedTableIds}
            onTableSelectionChange={setTableSelection}
            onSelectRelation={selectRelation}
            onMoveTables={onMoveTables}
            onAddForeignKey={onAddForeignKey}
            onAddForeignKeyWithNewColumn={onAddForeignKeyWithNewColumn}
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
      <DialogHost
        schemaName={schemaName}
        selectedTable={selectedTable}
        selectedColumn={selectedColumn}
        selectedKey={selectedKey}
        selectedForeignKey={selectedForeignKey}
        selectedRelationOwnerTable={selectedRelationOwnerTable}
        columnKeyMembership={columnKeyMembership}
        columnKeyMembershipDisabled={columnKeyMembershipDisabled}
        primaryKeyDisabled={primaryKeyDisabled}
      />
    </div>
  );
}
