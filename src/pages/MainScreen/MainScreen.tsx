import { useState } from "react";
import { format } from "date-fns";
import {
  EMPTY_COLUMN_KEY_MEMBERSHIP,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  hasConflictingPrimaryKey,
  type Table,
} from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createLocalStorageSchemaRepository } from "../../infrastructure/localStorageSchemaRepository";
import { ActiveDialogProvider } from "./ActiveDialogContext";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";
import { useSchemaWorkspace } from "./useSchemaWorkspace";

const defaultRepository = createLocalStorageSchemaRepository();
const NO_TABLES: Table[] = [];

type MainScreenProps = {
  /** Injection point for tests and stories; the app uses localStorage. */
  repository?: SchemaRepository;
};

function MainScreen({ repository = defaultRepository }: MainScreenProps) {
  return (
    <NotificationProvider>
      <ActiveDialogProvider>
        <MainScreenContent repository={repository} />
      </ActiveDialogProvider>
    </NotificationProvider>
  );
}

export default MainScreen;

type MainScreenContentProps = {
  repository: SchemaRepository;
};

function MainScreenContent({ repository }: MainScreenContentProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null | undefined>(undefined);
  const {
    currentSchema,
    savedSchemas,
    createSchema,
    selectSchema,
    renameSchema,
    deleteCurrentSchema,
    createTable,
    renameTable,
    updateTableComment,
    moveTable,
    addColumn,
    updateColumn,
    removeColumn,
    setColumnKeyMembership,
    addKey,
    updateKey,
    removeKey,
  } = useSchemaWorkspace(repository);

  if (currentSchema?.id !== selectedSchemaId) {
    setSelectedSchemaId(currentSchema?.id ?? null);
    setSelectedTableId(null);
    setSelectedColumnId(null);
    setSelectedKeyId(null);
  }

  const tables = currentSchema?.tables ?? NO_TABLES;
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const selectedColumn =
    selectedTable?.columns.find((column) => column.id === selectedColumnId) ?? null;
  const selectedKey = selectedTable?.keys.find((key) => key.id === selectedKeyId) ?? null;
  const columnId = selectedColumn?.id ?? null;
  const columnKeyMembership =
    selectedTable !== null
      ? getColumnKeyMembership(selectedTable, columnId)
      : EMPTY_COLUMN_KEY_MEMBERSHIP;
  const columnKeyMembershipDisabled =
    selectedTable !== null
      ? getColumnKeyMembershipDisabled(selectedTable, columnId)
      : EMPTY_COLUMN_KEY_MEMBERSHIP;
  const keyDialogPrimaryKeyDisabled =
    selectedTable !== null &&
    hasConflictingPrimaryKey(selectedTable, "PRIMARY_KEY", selectedKeyId ?? undefined);

  return (
    <MainScreenView
      schemaName={currentSchema?.name ?? "—"}
      savedSchemas={savedSchemas}
      currentSchemaId={currentSchema?.id ?? null}
      tables={tables}
      tableCount={tables.length}
      createdDate={currentSchema === null ? "—" : format(currentSchema.createdAt, "yyyy-MM-dd")}
      selectedTableId={selectedTableId}
      selectedTable={selectedTable}
      selectedColumn={selectedColumn}
      selectedKey={selectedKey}
      columnKeyMembership={columnKeyMembership}
      columnKeyMembershipDisabled={columnKeyMembershipDisabled}
      primaryKeyDisabled={keyDialogPrimaryKeyDisabled}
      isSidePanelOpen={isSidePanelOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
      onSelectSchema={selectSchema}
      onCreateSchema={createSchema}
      onRenameSchema={renameSchema}
      onDeleteSchema={deleteCurrentSchema}
      onSelectTable={(id) => {
        setSelectedTableId(id);
        setSelectedColumnId(null);
        setSelectedKeyId(null);
      }}
      onSelectColumn={setSelectedColumnId}
      onSelectKey={setSelectedKeyId}
      onCreateTable={createTable}
      onUpdateTableName={renameTable}
      onUpdateTableComment={updateTableComment}
      onMoveTable={moveTable}
      onAddColumn={addColumn}
      onUpdateColumn={updateColumn}
      onRemoveColumn={removeColumn}
      onSetColumnKeyMembership={setColumnKeyMembership}
      onAddKey={addKey}
      onUpdateKey={updateKey}
      onRemoveKey={removeKey}
    />
  );
}
