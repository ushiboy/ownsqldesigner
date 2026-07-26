import { type ReactNode, createContext, useContext, useMemo, useState } from "react";
import { useCurrentSchema } from "./SchemaWorkspaceContext";

export type InitialSelection = {
  tableId?: string;
  columnId?: string;
  keyId?: string;
  relationId?: string;
};

type SelectionContextValue = {
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedKeyId: string | null;
  selectedRelationId: string | null;
  selectTable: (id: string | null) => void;
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

  const value = useMemo(
    () => ({
      selectedTableId,
      selectedColumnId,
      selectedKeyId,
      selectedRelationId,
      selectTable: (id: string | null) => {
        setSelectedTableId(id);
        setSelectedColumnId(null);
        setSelectedKeyId(null);
      },
      selectColumn: setSelectedColumnId,
      selectKey: setSelectedKeyId,
      selectRelation: setSelectedRelationId,
    }),
    [selectedTableId, selectedColumnId, selectedKeyId, selectedRelationId],
  );

  return <SelectionContext value={value}>{children}</SelectionContext>;
}

export function useSelection(): SelectionContextValue {
  const value = useContext(SelectionContext);
  if (value === null) {
    throw new Error("useSelection must be used within a SelectionProvider");
  }
  return value;
}
