import { type ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useCurrentSchema } from "./SchemaWorkspaceContext";

export type InitialSelection = {
  tableIds?: string[];
  columnId?: string;
  keyId?: string;
  relationId?: string;
};

type SelectionContextValue = {
  /** Derived: the sole id when exactly one table is selected, else null. */
  selectedTableId: string | null;
  selectedTableIds: ReadonlySet<string>;
  selectedColumnId: string | null;
  selectedKeyId: string | null;
  selectedRelationId: string | null;
  selectTable: (id: string | null) => void;
  setTableSelection: (ids: readonly string[]) => void;
  selectColumn: (id: string | null) => void;
  selectKey: (id: string | null) => void;
  selectRelation: (id: string | null) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

type SelectionProviderProps = {
  /** Non-null only in stories and tests that start with a selection made. */
  initialSelection?: InitialSelection;
  children: ReactNode;
};

export function SelectionProvider({ initialSelection, children }: SelectionProviderProps) {
  const currentSchema = useCurrentSchema();
  const [selectedTableIds, setSelectedTableIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelection?.tableIds ?? []),
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
    setSelectedTableIds(new Set());
    setSelectedColumnId(null);
    setSelectedKeyId(null);
    setSelectedRelationId(null);
  }

  const value = useMemo(() => {
    const selectedTableId = selectedTableIds.size === 1 ? [...selectedTableIds][0]! : null;
    return {
      selectedTableId,
      selectedTableIds,
      selectedColumnId,
      selectedKeyId,
      selectedRelationId,
      selectTable: (id: string | null) => {
        const ids = id === null ? [] : [id];
        if (isSameTableSelection(selectedTableIds, ids)) {
          return;
        }
        setSelectedTableIds(new Set(ids));
        setSelectedColumnId(null);
        setSelectedKeyId(null);
      },
      // Guarded against a no-op update, not just as an optimization: Canvas's
      // onSelectionChange also echoes the current selection once on mount
      // (see docs/design/0015-multi-select-and-group-move.md), and an
      // unguarded call would clear an already-selected column/key on every
      // mount even though the table selection itself did not change.
      setTableSelection: (ids: readonly string[]) => {
        if (isSameTableSelection(selectedTableIds, ids)) {
          return;
        }
        setSelectedTableIds(new Set(ids));
        setSelectedColumnId(null);
        setSelectedKeyId(null);
      },
      selectColumn: setSelectedColumnId,
      selectKey: setSelectedKeyId,
      selectRelation: setSelectedRelationId,
    };
  }, [selectedTableIds, selectedColumnId, selectedKeyId, selectedRelationId]);

  return <SelectionContext value={value}>{children}</SelectionContext>;
}

export function useSelection(): SelectionContextValue {
  const value = useContext(SelectionContext);
  if (value === null) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return value;
}

function isSameTableSelection(current: ReadonlySet<string>, next: readonly string[]): boolean {
  return current.size === next.length && next.every((id) => current.has(id));
}
