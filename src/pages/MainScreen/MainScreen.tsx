import { useMemo, useState } from "react";
import {
  EMPTY_COLUMN_KEY_MEMBERSHIP,
  type ForeignKey,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  hasConflictingPrimaryKey,
  type Schema,
  type Table,
} from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createLocalStorageSchemaRepository } from "../../infrastructure/localStorageSchemaRepository";
import { ActiveDialogProvider, type DialogKind } from "./ActiveDialogContext";
import { describeForeignKey, type RelationSummary } from "./components/SidePanel";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";
import { SchemaWorkspaceProvider, useCurrentSchema, useTables } from "./SchemaWorkspaceContext";

const defaultRepository = createLocalStorageSchemaRepository();
const NO_RELATIONS: RelationSummary[] = [];

/** Page state a story or test can start from; all unset in the app. */
export type MainScreenSeed = {
  initialSchema?: Schema;
  initialSelection?: InitialSelection;
  initialDialog?: DialogKind | null;
  initialNotification?: string | null;
  initialSidePanelOpen?: boolean;
};

type InitialSelection = {
  tableId?: string;
  columnId?: string;
  keyId?: string;
  relationId?: string;
};

type MainScreenProps = MainScreenSeed & {
  /** Injection point for tests and stories; the app uses localStorage. */
  repository?: SchemaRepository;
};

function MainScreen({
  repository = defaultRepository,
  initialSchema,
  initialSelection,
  initialDialog,
  initialNotification,
  initialSidePanelOpen,
}: MainScreenProps) {
  return (
    <NotificationProvider initialNotification={initialNotification}>
      <ActiveDialogProvider initialDialog={initialDialog}>
        <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
          <MainScreenContent
            initialSelection={initialSelection}
            initialSidePanelOpen={initialSidePanelOpen}
          />
        </SchemaWorkspaceProvider>
      </ActiveDialogProvider>
    </NotificationProvider>
  );
}

export default MainScreen;

type MainScreenContentProps = {
  initialSelection?: InitialSelection;
  initialSidePanelOpen?: boolean;
};

function MainScreenContent({ initialSelection, initialSidePanelOpen }: MainScreenContentProps) {
  const currentSchema = useCurrentSchema();
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(initialSidePanelOpen ?? true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    initialSelection?.tableId ?? null,
  );
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(
    initialSelection?.columnId ?? null,
  );
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(
    initialSelection?.keyId ?? null,
  );
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(
    initialSelection?.relationId ?? null,
  );
  // Seeded from the workspace rather than starting undefined, so a seeded
  // schema does not read as a schema switch and wipe the seeded selection
  // on the first render.
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null | undefined>(
    () => currentSchema?.id,
  );
  if (currentSchema?.id !== selectedSchemaId) {
    setSelectedSchemaId(currentSchema?.id ?? null);
    setSelectedTableId(null);
    setSelectedColumnId(null);
    setSelectedKeyId(null);
    setSelectedRelationId(null);
  }

  const tables = useTables();
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
  const selectedRelation = findForeignKey(tables, selectedRelationId);
  const relations: RelationSummary[] = useMemo(
    () =>
      selectedTable !== null
        ? selectedTable.foreignKeys.map((foreignKey) => ({
            id: foreignKey.id,
            label: describeForeignKey(
              foreignKey,
              selectedTable.columns,
              tables.find((table) => table.id === foreignKey.referencedTableId),
            ),
          }))
        : NO_RELATIONS,
    [selectedTable, tables],
  );

  return (
    <MainScreenView
      selectedTableId={selectedTableId}
      selectedTable={selectedTable}
      selectedColumn={selectedColumn}
      selectedKey={selectedKey}
      selectedRelationId={selectedRelationId}
      selectedForeignKey={selectedRelation?.foreignKey ?? null}
      selectedRelationOwnerTable={selectedRelation?.table ?? null}
      relations={relations}
      columnKeyMembership={columnKeyMembership}
      columnKeyMembershipDisabled={columnKeyMembershipDisabled}
      primaryKeyDisabled={keyDialogPrimaryKeyDisabled}
      isSidePanelOpen={isSidePanelOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
      onSelectTable={(id) => {
        setSelectedTableId(id);
        setSelectedColumnId(null);
        setSelectedKeyId(null);
      }}
      onSelectColumn={setSelectedColumnId}
      onSelectKey={setSelectedKeyId}
      onSelectRelation={setSelectedRelationId}
    />
  );
}

function findForeignKey(
  tables: Table[],
  foreignKeyId: string | null,
): { table: Table; foreignKey: ForeignKey } | undefined {
  for (const table of tables) {
    const foreignKey = table.foreignKeys.find((fk) => fk.id === foreignKeyId);
    if (foreignKey !== undefined) {
      return { table, foreignKey };
    }
  }
  return undefined;
}
