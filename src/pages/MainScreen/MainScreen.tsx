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
import { CanvasApiProvider } from "./CanvasApiContext";
import { describeForeignKey, type RelationSummary } from "./components/SidePanel";
import { MainScreenView } from "./MainScreenView";
import { NotificationProvider } from "./NotificationContext";
import { SchemaWorkspaceProvider, useTables } from "./SchemaWorkspaceContext";
import { type InitialSelection, SelectionProvider, useSelection } from "./SelectionContext";

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
          <SelectionProvider initialSelection={initialSelection}>
            <CanvasApiProvider>
              <MainScreenContent initialSidePanelOpen={initialSidePanelOpen} />
            </CanvasApiProvider>
          </SelectionProvider>
        </SchemaWorkspaceProvider>
      </ActiveDialogProvider>
    </NotificationProvider>
  );
}

export default MainScreen;

type MainScreenContentProps = {
  initialSidePanelOpen?: boolean;
};

function MainScreenContent({ initialSidePanelOpen }: MainScreenContentProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(initialSidePanelOpen ?? true);
  const { selectedTableId, selectedColumnId, selectedKeyId, selectedRelationId } = useSelection();

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
      selectedTable={selectedTable}
      selectedColumn={selectedColumn}
      selectedKey={selectedKey}
      selectedForeignKey={selectedRelation?.foreignKey ?? null}
      selectedRelationOwnerTable={selectedRelation?.table ?? null}
      relations={relations}
      columnKeyMembership={columnKeyMembership}
      columnKeyMembershipDisabled={columnKeyMembershipDisabled}
      primaryKeyDisabled={keyDialogPrimaryKeyDisabled}
      isSidePanelOpen={isSidePanelOpen}
      onToggleSidePanel={() => setIsSidePanelOpen((prev) => !prev)}
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
