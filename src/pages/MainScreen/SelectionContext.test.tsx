import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Schema } from "../../domain/schema";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { createFakeSchemaRepository } from "../../test/fakeSchemaRepository";
import { NotificationProvider } from "./NotificationContext";
import { SchemaWorkspaceProvider, useSchemaActions } from "./SchemaWorkspaceContext";
import { type InitialSelection, SelectionProvider, useSelection } from "./SelectionContext";

const blogSchema: Schema = {
  id: "0b54b945-13c9-4d38-9ba6-b81bbe1cbc21",
  name: "Blog Schema",
  dialect: "sqlite",
  tables: [],
  createdAt: new Date("2026-07-01T09:00:00.000Z"),
  updatedAt: new Date("2026-07-01T09:00:00.000Z"),
};

const SEEDED_TABLE_ID = "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12";

const seededSelection: InitialSelection = {
  tableIds: [SEEDED_TABLE_ID],
  columnId: "f1a2b3c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c",
  keyId: "b1c2d3e4-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
  relationId: "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
};

function renderSelection(initialSelection?: InitialSelection) {
  const repository = createFakeSchemaRepository({
    schemas: [blogSchema],
    lastSchemaId: blogSchema.id,
  });
  return renderHook(() => ({ selection: useSelection(), actions: useSchemaActions() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider>
        <NotificationProvider>
          <SchemaWorkspaceProvider repository={repository} initialSchema={blogSchema}>
            <SelectionProvider initialSelection={initialSelection}>{children}</SelectionProvider>
          </SchemaWorkspaceProvider>
        </NotificationProvider>
      </LocaleProvider>
    ),
  });
}

describe("SelectionContext", () => {
  it("seeds the selection ids from initialSelection", () => {
    const { result } = renderSelection(seededSelection);

    expect(result.current.selection.selectedTableId).toBe(SEEDED_TABLE_ID);
    expect(result.current.selection.selectedTableIds).toEqual(new Set([SEEDED_TABLE_ID]));
    expect(result.current.selection.selectedColumnId).toBe(seededSelection.columnId);
    expect(result.current.selection.selectedKeyId).toBe(seededSelection.keyId);
    expect(result.current.selection.selectedRelationId).toBe(seededSelection.relationId);
  });

  it("does not reset the seeded selection on the first render", () => {
    const { result } = renderSelection(seededSelection);

    expect(result.current.selection.selectedTableId).toBe(SEEDED_TABLE_ID);
  });

  it("clears the column and key selection when selecting a table", () => {
    const { result } = renderSelection(seededSelection);

    act(() => {
      result.current.selection.selectTable("a-different-table-id");
    });

    expect(result.current.selection.selectedTableId).toBe("a-different-table-id");
    expect(result.current.selection.selectedColumnId).toBeNull();
    expect(result.current.selection.selectedKeyId).toBeNull();
  });

  it("resets all four selection ids when the current schema changes", () => {
    const { result } = renderSelection(seededSelection);

    act(() => {
      result.current.actions.createSchema("New Schema");
    });

    expect(result.current.selection.selectedTableId).toBeNull();
    expect(result.current.selection.selectedTableIds).toEqual(new Set());
    expect(result.current.selection.selectedColumnId).toBeNull();
    expect(result.current.selection.selectedKeyId).toBeNull();
    expect(result.current.selection.selectedRelationId).toBeNull();
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useSelection())).toThrow(
      "useSelection must be used within a SelectionProvider",
    );
  });

  it("clears all four selection ids via clearSelection", () => {
    const { result } = renderSelection(seededSelection);

    act(() => {
      result.current.selection.clearSelection();
    });

    expect(result.current.selection.selectedTableId).toBeNull();
    expect(result.current.selection.selectedTableIds).toEqual(new Set());
    expect(result.current.selection.selectedColumnId).toBeNull();
    expect(result.current.selection.selectedKeyId).toBeNull();
    expect(result.current.selection.selectedRelationId).toBeNull();
  });

  describe("setTableSelection", () => {
    it("replaces the whole table selection set", () => {
      const { result } = renderSelection(seededSelection);

      act(() => {
        result.current.selection.setTableSelection(["table-a", "table-b"]);
      });

      expect(result.current.selection.selectedTableIds).toEqual(new Set(["table-a", "table-b"]));
    });

    it("derives a null selectedTableId when 0 or 2+ tables are selected", () => {
      const { result } = renderSelection(seededSelection);

      act(() => {
        result.current.selection.setTableSelection(["table-a", "table-b"]);
      });
      expect(result.current.selection.selectedTableId).toBeNull();

      act(() => {
        result.current.selection.setTableSelection([]);
      });
      expect(result.current.selection.selectedTableId).toBeNull();
    });

    it("derives the sole id as selectedTableId when exactly one table is selected", () => {
      const { result } = renderSelection(seededSelection);

      act(() => {
        result.current.selection.setTableSelection(["table-a"]);
      });

      expect(result.current.selection.selectedTableId).toBe("table-a");
    });

    it("clears the column and key selection", () => {
      const { result } = renderSelection(seededSelection);

      act(() => {
        result.current.selection.setTableSelection(["table-a", "table-b"]);
      });

      expect(result.current.selection.selectedColumnId).toBeNull();
      expect(result.current.selection.selectedKeyId).toBeNull();
    });

    it("does not clear the column and key selection when the table set is unchanged", () => {
      const { result } = renderSelection(seededSelection);

      act(() => {
        result.current.selection.setTableSelection([SEEDED_TABLE_ID]);
      });

      expect(result.current.selection.selectedColumnId).toBe(seededSelection.columnId);
      expect(result.current.selection.selectedKeyId).toBe(seededSelection.keyId);
    });
  });
});
