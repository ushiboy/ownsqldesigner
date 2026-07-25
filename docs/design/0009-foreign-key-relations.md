# Foreign Key Relations

- **Status**: Implemented
- **Created**: 2026-07-25
- **Updated**: 2026-07-25

## Context

[0001](0001-main-screen.md) already committed to the shape of this feature — foreign-key relations render as edges on the canvas, created by connecting column handles — but explicitly deferred the exact rendering/validation design to a later doc. [0007](0007-table-key-management.md) built the `Key` (PRIMARY KEY/UNIQUE/INDEX) data model and explicitly deferred foreign keys to "the next doc," noting that FK arrows need PK/UNIQUE columns as visual endpoints. This doc is that next step, covering REQ-014, REQ-015, REQ-020, and the still-open half of REQ-021 (table/column deletion must not leave dangling relations — the key-member half of REQ-021 is already implemented).

## Goals / Non-Goals

**Goals**

- A `ForeignKey` data model on the owning (child) table, referencing a column on another (or the same) table.
- Creating and removing a foreign key by dragging a connection between column handles on the canvas (REQ-014).
- Rendering relation connectors as curved, auto-routed edges, highlighted when selected (REQ-015).
- Restricting FK targets to PRIMARY KEY / UNIQUE columns (REQ-020).
- Deleting a table or column never leaves a dangling foreign key on any table (REQ-021).

**Non-Goals**

- REQ-016 (auto-generate a child column when creating a foreign key) and REQ-017 (propagate parent type changes to child columns) — Phase 2, next docs.
- Composite (multi-column) foreign keys — no requirement drives this; a single drag gesture naturally produces one column pair.
- `ON DELETE` / `ON UPDATE` actions (CASCADE, SET NULL, ...) — not in `docs/requirements.md`.
- FK column _type_ compatibility validation — REQ-020 only requires the target to be PK/UNIQUE, not type-matching.
- Editing an existing foreign key's endpoints — only create/remove; "editing" is delete-and-redraw.
- Showing incoming ("referenced by") relations on the referenced table's own side panel — only the owning table lists its outgoing foreign keys.
- Obstacle-avoiding edge routing — see Design.

## Design

### Data model

```ts
export const foreignKeySchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(), // this table's own (child) column
  referencedTableId: z.uuid(),
  referencedColumnId: z.uuid(),
});
export type ForeignKey = z.infer<typeof foreignKeySchema>;
```

`Table` gains `foreignKeys: ForeignKey[]`, defaulting to `[]` in `createTable` — the same no-migration-needed reasoning 0005/0006/0007 used for `position`/`columns`/`keys`. It lives on the owning (child, referencing) table, mirroring SQL's own `FOREIGN KEY ... REFERENCES` placement and `Key`'s existing per-table placement. Like `Key`, it has no `name` field: no consumer needs one until SQL export exists.

### REQ-020 enforcement: UI-only vs domain-owned

Following 0007's established split for this exact category of rule ("simple validity" → UI-side prevention + a cheap domain no-op guard as defense-in-depth, not a rejected-with-reason mutation):

- `isReferenceableColumn(table, columnId)` and `getReferenceableColumns(table)` are new exported query functions (alongside `getColumnKeyMembership`) that answer "is this column the sole member of a PRIMARY_KEY or UNIQUE key on its table."
- The canvas only renders a _target_ connection handle on referenceable columns (see below) — there is nothing to drop a connection onto for any other column, the strongest form of "disabled, not rejected."
- `addForeignKey` re-checks `isReferenceableColumn` on the referenced column and no-ops if it fails, mirroring `canAddKey`'s role for REQ-022. No `notify()`-based rejection is added, consistent with 0007's explicit rejection of that pattern for this category of rule.

### REQ-021: cross-table cascade delete

Every existing mutation in `schema.ts` is scoped to the single table matched by `tableId`. Foreign keys break that scoping, since a table's incoming references live on _other_ tables. `removeTable` and `removeColumn` gain a second pass over the whole table list, via two new private helpers (placed near the existing `removeColumnFromKeys`, which does the same job for `Key`):

- `removeForeignKeysReferencingTable(tables, removedTableId)` — strips any table's FKs whose `referencedTableId` is the table being removed.
- `removeForeignKeysInvolvingColumn(tables, columnId)` — strips any table's FKs where the column is either the FK's own `columnId` or its `referencedColumnId`, covering both directions in one pass (column ids are globally-unique UUIDs, so no per-table matching is needed).

`removeTable` pipes the remaining tables through the first helper after filtering; `removeColumn` pipes its entire result through the second helper after its existing table-scoped column/key removal.

### Creation UX: canvas drag-to-connect, no dialog

REQ-014's wording ("connecting existing columns") and REQ-015's rendering requirement both point at direct manipulation, and 0001 already committed to this shape. A dialog would duplicate the "which columns are valid targets" logic the canvas already expresses visually via which handles exist, for no benefit. Creating an FK is additive (not destructive), matching this app's existing precedent that additive actions (`moveTable`, `addColumn`) apply immediately with no confirmation step.

`TableNode` renders, per column row: a `source` handle (right side) on every column — any column may be an FK's child side — and a `target` handle (left side) only on referenceable columns. Handle ids encode the column id (`columnHandleId.ts`: `sourceHandleId`/`targetHandleId`/`columnIdFromHandle`) so `Canvas`'s `onConnect` can translate a xyflow connection event directly into `addForeignKey(childTableId, { columnId, referencedTableId, referencedColumnId })`. `isValidConnection` re-checks referenceability as defense-in-depth. Self-referencing FKs (a table referencing its own PK) need no special-casing: both handles are just two points on the same node at different row offsets.

### Rendering

`Canvas` computes `edges` from `tables.flatMap(t => t.foreignKeys.map(...))` instead of the previous hardcoded empty array, one xyflow edge per `ForeignKey`. React Flow's default bezier edge already satisfies "curved, auto-routed" as _automatic curve placement between handle coordinates_ — resolving the interpretation 0001 explicitly left open — not obstacle-avoiding routing around other nodes; that's out of scope until dense schemas make it a real usability problem. Selection highlight (the rest of REQ-015) is a per-edge `style` keyed off whether the edge's id matches the selected relation id, the same pattern `TableNode`'s `card({ selected })` variant uses for node selection.

### Selection and deletion

A foreign key can be selected by clicking its edge, tracked as `selectedRelationId`, sibling to `selectedTableId`/`selectedColumnId`/`selectedKeyId` and mutually exclusive with table selection (selecting one clears the other) so keyboard-delete routing stays unambiguous.

The side panel's `TableProperties` gains a read-only "Relations" section — list plus a delete icon per row, no Add button (creation is canvas-only) and no edit — giving keyboard/discoverability parity with the Keys section and a second, precise deletion entry point besides clicking a thin edge. Deletion goes through the same `ConfirmDialog` pattern as every other destructive action in this app, triggered either from that row's delete button or from the existing canvas keyboard-delete flow (Delete/Backspace), which now branches on whether a relation or a table is currently selected.

## Alternatives Considered

- **Dialog-based FK creation** (select child table/column + parent table/column from dropdowns) — rejected: duplicates the validity information the canvas already conveys visually, and breaks from 0001's committed direct-manipulation shape.
- **`notify()`-based rejection message for REQ-020 violations** — rejected, following 0007's precedent against this exact pattern for the same category of rule; UI-side prevention (no target handle to drop onto) is the primary mechanism.
- **Custom edge component for obstacle-avoiding routing** — rejected for now: default bezier edges are sufficient at this scale; revisit if dense schemas make overlapping edges a real problem.
- **Composite foreign keys** — rejected: no requirement drives the added complexity of pairing ordered column lists; single-column FKs cover every current use case.

## Open Questions

- REQ-021 only requires that deleting a table/column never leaves a dangling reference. It does not require the same for un-keying a PRIMARY KEY/UNIQUE column that's still referenced by another table's FK — e.g. removing a column's sole UNIQUE key while a foreign key still points at it. That case is left unresolved here; revisit if it proves confusing in practice.
