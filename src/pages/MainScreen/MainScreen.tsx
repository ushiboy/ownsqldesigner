import { useMemo, useState } from "react";
import { useFkNamingPattern } from "../../components/hooks/useFkNamingPattern";
import {
  EMPTY_COLUMN_KEY_MEMBERSHIP,
  EMPTY_COLUMN_KEY_MEMBERSHIP_DISABLED,
  type FkNamingPattern,
  type ForeignKey,
  getColumnKeyMembership,
  getColumnKeyMembershipDisabled,
  hasConflictingPrimaryKey,
  type Schema,
  type Table,
} from "../../domain/schema";
import type { SchemaRepository } from "../../domain/schemaRepository";
import { createLocalStorageSchemaRepository } from "../../infrastructure/localStorageSchemaRepository";
import type { Locale } from "../../i18n/Locale";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { ActiveDialogProvider, type DialogKind } from "./ActiveDialogContext";
import { CanvasApiProvider } from "./CanvasApiContext";
import { describeForeignKey, type RelationSummary } from "./components/SidePanel";
import { useColumnDetailsVisibility } from "./hooks/useColumnDetailsVisibility";
import { useSnapToGrid } from "./hooks/useSnapToGrid";
import { type Theme, useThemePreference } from "./hooks/useThemePreference";
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
  initialTheme?: Theme;
  initialLocale?: Locale;
  initialShowColumnDetails?: boolean;
  initialSnapToGrid?: boolean;
  initialFkNamingPattern?: FkNamingPattern;
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
  initialTheme,
  initialLocale,
  initialShowColumnDetails,
  initialSnapToGrid,
  initialFkNamingPattern,
}: MainScreenProps) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <NotificationProvider initialNotification={initialNotification}>
        <ActiveDialogProvider initialDialog={initialDialog}>
          <SchemaWorkspaceProvider repository={repository} initialSchema={initialSchema}>
            <SelectionProvider initialSelection={initialSelection}>
              <CanvasApiProvider>
                <MainScreenContent
                  initialSidePanelOpen={initialSidePanelOpen}
                  initialTheme={initialTheme}
                  initialShowColumnDetails={initialShowColumnDetails}
                  initialSnapToGrid={initialSnapToGrid}
                  initialFkNamingPattern={initialFkNamingPattern}
                />
              </CanvasApiProvider>
            </SelectionProvider>
          </SchemaWorkspaceProvider>
        </ActiveDialogProvider>
      </NotificationProvider>
    </LocaleProvider>
  );
}

export default MainScreen;

type MainScreenContentProps = {
  initialSidePanelOpen?: boolean;
  initialTheme?: Theme;
  initialShowColumnDetails?: boolean;
  initialSnapToGrid?: boolean;
  initialFkNamingPattern?: FkNamingPattern;
};

function MainScreenContent({
  initialSidePanelOpen,
  initialTheme,
  initialShowColumnDetails,
  initialSnapToGrid,
  initialFkNamingPattern,
}: MainScreenContentProps) {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(initialSidePanelOpen ?? true);
  const { theme, resolvedTheme, cycleTheme } = useThemePreference(initialTheme);
  const { showColumnDetails, toggleShowColumnDetails } =
    useColumnDetailsVisibility(initialShowColumnDetails);
  const { snapToGrid, toggleSnapToGrid } = useSnapToGrid(initialSnapToGrid);
  const { fkNamingPattern } = useFkNamingPattern(initialFkNamingPattern);
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
      ? getColumnKeyMembershipDisabled(selectedTable, columnId, tables)
      : EMPTY_COLUMN_KEY_MEMBERSHIP_DISABLED;
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
      theme={theme}
      onCycleTheme={cycleTheme}
      colorMode={resolvedTheme}
      showColumnDetails={showColumnDetails}
      onToggleColumnDetails={toggleShowColumnDetails}
      snapToGrid={snapToGrid}
      onToggleSnapToGrid={toggleSnapToGrid}
      fkNamingPattern={fkNamingPattern}
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
