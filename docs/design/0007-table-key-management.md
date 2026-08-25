# Table Key Management

- **Status**: Implemented
- **Created**: 2026-07-22
- **Updated**: 2026-08-03

## Context

`Table` has never had a keys concept: [0004](0004-table-creation-and-placement.md) deferred "Columns and keys" wholesale, and [0006](0006-table-column-management.md) built columns but explicitly deferred both keys and auto-increment together, noting that REQ-033 (auto-increment validity) ties to a PRIMARY KEY, and REQ-013 (keys) didn't exist yet to validate against. This doc lands both in one change, since REQ-033 cannot be validated without REQ-013 and REQ-022 existing first.

## Goals / Non-Goals

**Goals**

- A `Key`/`KeyType` data model on `Table`, supporting composite (multi-column) keys, with `PRIMARY KEY` / `UNIQUE` / `INDEX` kinds.
- `addKey`/`updateKey`/`removeKey` domain functions in `schema.ts`.
- A `KeyDialog` for adding/editing a key, with multi-column (checkbox) selection.
- A "Keys" section in the side panel's `TableProperties`, mirroring the Columns section.
- `Column.autoIncrement: boolean`, editable from the existing `ColumnDialog`, valid only when SQLite's rule holds (sole INTEGER PRIMARY KEY column).
- REQ-022 enforced: at most one PK per table; every key has at least one column.
- Deleting a column never leaves a dangling key member, and never leaves an invalid auto-increment flag behind.

**Non-Goals**

- Foreign keys / relation edges (REQ-014, REQ-015, REQ-020) — next doc.
- Rendering PK/UNIQUE/INDEX markers on the canvas — deferred. This overlaps REQ-012's undesigned "toggle canvas detail" scope, and is better motivated once the next doc (foreign keys) needs a visual endpoint for FK arrows to terminate at PK/UNIQUE columns. Same precedent as 0006 deferring canvas type/size display.
- Key/column name uniqueness and SQL-identifier validation (REQ-018/019) — unchanged deferral from 0006.
- User-supplied key names — see Design below.
- Key/column reordering within a composite key beyond the table's natural column order (see Open Questions).

## Design

### Data model

```ts
export const KEY_TYPES = ["PRIMARY_KEY", "UNIQUE", "INDEX"] as const;
export type KeyType = (typeof KEY_TYPES)[number];

export const keySchema = z.object({
  id: z.uuid(),
  type: z.enum(KEY_TYPES),
  columnIds: z.array(z.uuid()).min(1),
});
export type Key = z.infer<typeof keySchema>;
```

`Table` gains `keys: Key[]`, defaulting to `[]` in `createTable` — same "not yet released, no migration needed" reasoning 0005/0006 used for adding `position`/`columns`. `Column` gains `autoIncrement: boolean`.

`Key` has no `name` field: no current consumer needs one (no SQL export exists yet to need `CREATE INDEX <name>`), so adding it now would be speculative state. The side panel instead computes a display label from type + column names. Naming can be added later without a breaking migration, the same way `columns`/`position` were added.

`KEY_TYPES` uses internal tokens (`PRIMARY_KEY`, not `"PRIMARY KEY"`) rather than verbatim SQL keywords, unlike `SQLITE_COLUMN_TYPES` — these are multi-word SQL fragments, not single-word storage-class keywords, and translating to exact SQL syntax is left to the future export doc (REQ-026).

### REQ-022 / REQ-033 enforcement: UI-only vs domain-owned

This codebase's existing precedent for simple field validity (table/column name non-emptiness) is UI-only: the zod schema states the invariant, but mutation functions trust the caller and the actual prevention is a disabled submit button. There is no existing precedent of a mutation being rejected with a surfaced reason — the one `notify()` call in `useSchemaWorkspace` handles an unrelated async load failure. This doc treats REQ-022/REQ-033 as two different categories, each following the closest existing precedent:

1. **Simple validity** ("a key has at least one column", "at most one PK") — UI-only prevention, matching name-emptiness: `KeyDialog`'s submit is disabled while zero columns are checked, and the `PRIMARY_KEY` option is disabled once the table already has a different PK. A cheap domain-level no-op guard is added too, extending the existing "no-op if target missing" style of `updateColumn`/`removeColumn` to "no-op on invalid write" — defense-in-depth, not the primary UX mechanism.
2. **Cross-record cascading invariants** (dangling key members after a column is deleted; auto-increment becoming invalid because keys changed) — the same category as the existing "deleting a column never leaves dangling relations" rule, which has no UI-level equivalent. These get real domain-level enforcement:
   - `removeColumn` strips the removed column's id from every key's `columnIds`, and drops any key left with zero columns.
   - A private helper `withNormalizedAutoIncrement(table)` recomputes every column's `autoIncrement` as `column.autoIncrement && column.type === "INTEGER" && column.id === <the sole column id of the table's sole single-column PRIMARY_KEY key, if any>`. It is applied at the end of `updateColumn`, `removeColumn`, `addKey`, `updateKey`, and `removeKey` — every mutation that can change either side of that condition. It only ever turns the flag off, so it is safe to reapply unconditionally.

### Domain functions

`addKey`/`updateKey`/`removeKey` in `schema.ts`, placed after `removeColumn`, following the same `(schema, tableId, ...fields, options?)` shape, `id`/`now` option defaults, and no-op-on-missing-target guard as `addColumn`/`updateColumn`/`removeColumn`. `updateKey` replaces the whole key's fields at once, matching `updateColumn`'s wholesale-replace convention. A new `hasKey` predicate mirrors the existing `hasColumn`; a new `hasConflictingPrimaryKey(table, type, excludeKeyId?)` predicate names the PK-conflict check per code-organization.md's rule against inline compound booleans.

### `KeyDialog`

Mirrors `ColumnDialog`'s outer-`Dialog` + inner-form-mounted-only-while-open shape. Column selection uses a checkbox per table column (not a native multi-select, whose "hold Ctrl/Cmd" interaction is undiscoverable) — the same control already used for `nullable` in `ColumnForm`. The key-type `<select>` disables the `PRIMARY_KEY` option when the caller indicates the table already has a different PK. Submit is disabled while no column is checked.

### Single-column key membership and auto-increment in `ColumnDialog`

Auto-increment is a per-column field like `nullable`, so it's added to the existing `ColumnDialog`/`ColumnForm` rather than a new component.

An initial version required setting a column as PRIMARY KEY as a separate step via `KeyDialog` before auto-increment became available on it — creating a table's typical `id INTEGER PRIMARY KEY AUTOINCREMENT` column meant add-column, then add-key, then re-open edit-column. Since a single-column key (of any of the three types) is by far the common case (composite keys remain the `KeyDialog`'s job), `ColumnDialog` carries a checkbox per `KeyType` — "Primary Key", "Unique", "Index" — letting a column's own fields and its simple key membership be set in the same submit.

A new domain type and function generalize this beyond just PRIMARY KEY:

```ts
export type ColumnKeyMembership = Record<KeyType, boolean>;

export function setColumnKeyMembership(
  schema: Schema,
  tableId: string,
  columnId: string,
  membership: ColumnKeyMembership,
  options?: { now?: Date },
): Schema;
```

`setColumnKeyMembership` reconciles all three types in one bumped-`updatedAt` step: for each type, it finds the column's existing single-column key of that type (if any) and adds, removes, or leaves it alone to match `membership`. It's built from the same `addKey`/`removeKey` used elsewhere — no new mutation primitive, just composition — so the existing PK-conflict guard and `withNormalizedAutoIncrement` normalization still apply per sub-step. Two companion query functions, `getColumnKeyMembership(table, columnId)` and `getColumnKeyMembershipDisabled(table, columnId)` (both accepting `columnId: string | null` for the not-yet-created-column/"Add" case), compute the checkboxes' seed and disabled state; `ColumnDialog` and `KeyDialog`'s disabled-PK-option logic both call into `hasConflictingPrimaryKey` (now exported) rather than duplicating the "does another key already hold the PK" check.

- `keyMembershipDisabled[type]` is true when a _different_ composite key of that type already includes this column (or, for `PRIMARY_KEY` specifically, when any other key already holds the table's PK — REQ-022's "at most one" rule). A brand-new column (`columnId: null`) is never disabled for UNIQUE/INDEX, since it can't yet be a composite-key member; it can still be PK-disabled if the table already has one.
- `autoIncrementAllowed` is computed live against the PRIMARY_KEY checkbox's _current_ state (`keyMembership.PRIMARY_KEY && type === "INTEGER"`), not the static seed prop, so checking "Primary Key" and "Auto increment" together in one dialog session is the point.
- `onSubmit(fields, keyMembership)` reports the column fields and the three checkboxes' final state. The column dialog itself has no notion of `Key` — orchestration happens in `MainScreenView`, which calls `onAddColumn`/`onUpdateColumn` followed by a single `onSetColumnKeyMembership` call, the same layer that already composes selection with dialog-open elsewhere.
- For **add**, the new column's id is generated by the caller (`crypto.randomUUID()`) and passed through `useSchemaWorkspace.addColumn`'s new optional `id` parameter (forwarding to `addColumn`'s existing `options.id`, previously only used by tests) — this is what lets the same-submit `setColumnKeyMembership` call reference the right column id, since the column and its keys are written via two sequential `setCurrentSchema` calls in the same event handler (safe: React applies queued functional updates in order).

Each checkbox is disabled (not conditionally hidden) when not allowed, with a caption explaining why — the same "disabled, not rejected" pattern used everywhere else in this codebase.

### Side panel

A "Keys" section is added to `TableProperties`, structurally identical to the existing Columns section (list + Add button + per-row edit/delete icon buttons). Since `Key` has no name, a `describeKey` helper renders a label like `PRIMARY KEY (id)` / `UNIQUE (email)` / `INDEX (last_name, first_name)` from the key's type and its columns' names, in the table's column order.

## Alternatives Considered

- **A user-supplied `name` field on `Key` now** — rejected: no current consumer needs it; a computed label is sufficient until SQL export exists, and adding a name later is a non-breaking widen.
- **A `<select multiple>` for composite column selection** — rejected: the "hold Ctrl/Cmd" interaction is undiscoverable; checkboxes match the existing `nullable` convention.
- **Domain-level `notify()`-based rejection for REQ-022 violations** — rejected: no such pattern exists anywhere yet; UI-side disabling (matching name-emptiness precedent) is this codebase's established mechanism for preventing invalid submissions.
- **Rendering PK/UNIQUE/INDEX badges on `TableNode` now** — deferred: overlaps REQ-012's undesigned scope and is better motivated once FK edges need visual endpoints.
- **A `SelectedKeyContext`** — rejected for the same reason `selectedColumnId`/`selectedTableId` stayed plain `useState`: one producer, one consumer, already siblings at the existing prop-drilling depth.
- **Making the domain-level no-op the only PK-limit mechanism** — rejected: a silent no-op with no explanation is bad UX on its own; UI-side prevention is the primary mechanism, the domain no-op is defense-in-depth only.
- **Keeping single-column key membership as a `KeyDialog`-only, separate step after column creation** — rejected: for the common single-column case, requiring add-column → add-key → re-edit-column just to enable auto-increment was reported as cumbersome; folding PK/UNIQUE/INDEX checkboxes into `ColumnDialog` removes two of those three steps. Composite keys still require `KeyDialog`.
- **Starting with a PK-only checkbox, then extending to UNIQUE/INDEX as three separate ad-hoc `onAddKey`/`onRemoveKey` diffs in `MainScreenView`** — rejected once a second and third checkbox were needed: manually diffing "previous vs next" per type in the view layer duplicates logic that's better owned by the domain (`setColumnKeyMembership`), which also keeps `MainScreenView`'s submit handlers a single call instead of branching per type.

## Open Questions

- ~~Whether composite key column order (e.g. for a multi-column INDEX,
  where order can matter for query planning) needs to be user-controllable,
  given the checkbox UI naturally orders by the table's column order — left
  unresolved; revisit once SQL export (REQ-026) needs a concrete column
  order for `CREATE INDEX`.~~ Resolved in
  [0031](0031-composite-key-column-ordering.md): `KeyDialog` now shows each
  checked column's position and lets the user reorder them with move
  up/down buttons.
- Whether `Key` should eventually gain a `name` field once SQL export needs named constraints/indexes — deferred, not a blocker.
- Whether `addKey`/`updateKey` should defensively filter `columnIds` down to ids that actually exist on the table — not implemented here since `KeyDialog` can only ever offer the table's own columns; revisit if this proves fragile.
- ~~Whether the "Keys" section's per-row label reads well once a table has many composite keys with long column lists — no truncation is designed here; revisit if it proves visually noisy in practice.~~ Resolved in [0049](0049-key-row-label-title-tooltip.md): the label already CSS-ellipsizes via `truncate`; a `title` attribute now exposes the full label on hover/focus.
