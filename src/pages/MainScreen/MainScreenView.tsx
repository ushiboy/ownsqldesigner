import { useMemo } from "react";
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
  useSavedSchemas,
  useSchemaActions,
  useTables,
} from "./SchemaWorkspaceContext";
import { useSelection } from "./SelectionContext";
import { useDeleteKeyShortcut } from "./hooks/useDeleteKeyShortcut";

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
    selectSchema: onSelectSchema,
    renameTable: onUpdateTableName,
    updateTableComment: onUpdateTableComment,
    moveTable: onMoveTable,
    addForeignKey: onAddForeignKey,
    addForeignKeyWithNewColumn: onAddForeignKeyWithNewColumn,
  } = useSchemaActions();

  const schemaName = currentSchema?.name ?? NO_VALUE;
  const createdDate =
    currentSchema === null ? NO_VALUE : format(currentSchema.createdAt, "yyyy-MM-dd");
  const siblingTableNames = useMemo(
    () => tables.filter((table) => table.id !== selectedTableId).map((table) => table.name),
    [tables, selectedTableId],
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
