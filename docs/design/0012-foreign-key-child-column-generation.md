# Foreign Key Child Column Generation

- **Status**: Implemented
- **Created**: 2026-07-26
- **Updated**: 2026-07-27

## Context

[0009](0009-foreign-key-relations.md) implemented foreign-key creation as a
canvas drag: from a column's `source` handle (the future child column, which
must already exist) to a referenceable column's `target` handle (the parent —
its sole PRIMARY KEY or UNIQUE column). That doc explicitly deferred REQ-016
("auto-generate a child column when creating a foreign key") and REQ-017
("propagate parent type changes to child columns") as "Phase 2, next docs."
This doc is that next step for REQ-016 only; REQ-017 is unrelated (it's about
keeping an already-linked column's type in sync after the fact, not creation)
and is left for its own doc.

Today, creating a relation to a table that doesn't yet have a suitable child
column requires a separate manual step: add the column, then drag the
connection. REQ-016 removes that step for the common case — dragging from a
parent's key handle and dropping on the table that should reference it should
be enough.

Two facts about the installed `@xyflow/react`/`@xyflow/system` (verified
against the library's own type declarations and built source, not assumed)
shaped the design:

- Every `Handle`, including `target`-type ones, is drag-startable by default
  (`isConnectableStart` defaults to `true`). Nothing needs to change to let a
  user start dragging from a parent's key handle outward — that gesture
  already works today, it's just not connected to anything.
- `FinalConnectionState.toNode` (the payload xyflow's `onConnectEnd` receives)
  is populated only when the drop lands on a handle — it does not
  distinguish "dropped on a table's body" from "dropped on the empty pane";
  both give `toNode: null`. Telling those two cases apart needs a small DOM
  lookup at drop time: the node wrapper xyflow renders for every table
  carries the class `react-flow__node` and a `data-id` attribute equal to the
  table id, reachable via `event.target.closest(...)`.

Driving the actual gesture during development surfaced two more problems,
both folded into this same doc rather than split into separate ones, since
all three landed in the same round of work:

- With no in-drag feedback beyond xyflow's default floating connection line,
  it was unclear which tables were valid drop targets — nothing indicated
  where to release the drag.
- Dropping precisely onto an _existing_ column's own handle (e.g. an
  `author_id` column the user had already created) was silently ignored: the
  drop always fell through to creating a redundant new column next to it,
  regardless of where within the table it landed. The user's evident intent
  — reuse the existing column — went unhonored, with no error surfaced.

## Goals / Non-Goals

**Goals**

- Dragging from a referenceable (key) column's handle and dropping on another
  table's body (or back onto the same table, for a self-reference) creates a
  new column on that table and a foreign key referencing the dragged-from
  column, in one gesture, with no dialog.
- The new column gets a deterministic, collision-safe name and a type valid
  for the current dialect with no user input required.
- The existing "connect two already-existing columns" gesture (source →
  target) is unaffected.
- While the drag is in progress, every valid drop target is visually marked,
  understandably without relying on color alone.
- Dropping precisely on an existing column's own (source) handle links that
  column as the foreign key's child instead of creating a new one.

**Non-Goals**

- Configurable or persisted naming pattern — REQ-016's wording mentions a
  "configurable naming pattern," but that configurability is REQ-032's
  concern (Phase 3, persisted settings), and no settings-persistence module
  exists anywhere in this codebase yet. This doc hardcodes one fixed pattern;
  REQ-032 can later make it a setting without changing anything here.
- REQ-017 (propagating parent type changes to already-linked child columns) —
  separate doc.
- Touch-drag precision for this gesture — `event.target` on touch end events
  reports the touch-start target in most browsers, not the drop point; no
  touch-specific handling exists elsewhere in this codebase either, so this
  is an accepted gap, not solved here (touch/mobile support is a stated
  Non-Goal of the app as a whole, per `docs/requirements.md`).
- Composite (multi-column) foreign keys — inherits 0009's existing non-goal.
- Highlighting individual valid drop _columns_ within a table during the
  drag, rather than the whole table body — the default destination is "the
  table" (a new column gets created), so table-level marking already matches
  the common case; each existing column's own tooltip covers the
  precise-drop case.
- A first-run tutorial or persistent legend explaining the gesture exists at
  all — only in-drag feedback is addressed here.
- Restricting which existing column is a valid target for the precise-drop
  case (beyond excluding the column being dragged from itself) — REQ-020
  (parent must be PK/UNIQUE) already restricts the parent side; the child
  side has no additional restriction today, matching REQ-014's original
  gesture.

## Design

### Trigger gesture and taking explicit control of its direction

xyflow's Strict `connectionMode` type-pairs a `source`-type handle with a
`target`-type handle regardless of which one a drag starts from, so in
principle a key-handle-originated drag ending on an existing column's source
handle could complete as a normal, reversed `onConnect`. In practice this
didn't fire the way the library's own logic suggested it should when driven
in the running app — most likely because its "closest handle under the
pointer" hit-testing behaves differently once a drag no longer starts from a
`source`-type handle. Rather than depend on that inconsistency, `Canvas`
takes deterministic, explicit control of this entire direction instead of
leaning on xyflow's native completion:

- `onConnectStart`'s `handleType` is captured in a ref
  (`dragStartHandleTypeRef`) — it fires once, synchronously, at the start of
  every drag.
- `isValidConnection` unconditionally rejects the connection whenever that
  ref says the drag started from a `target`-type handle. This guarantees
  `onConnect` (and the "link two existing columns" domain call it makes) can
  now _only_ ever fire for the original 0009 direction (source → target),
  removing any chance of xyflow's native path double-firing alongside the
  logic below.
- Every key-handle-originated drop is instead resolved entirely by
  `onConnectEnd`, via a pure, unit-tested function, `resolveForeignKeyDrop`
  (`connectionEnd.ts`). It takes the connection state plus two independently
  DOM-resolved values and returns a discriminated `ForeignKeyDrop`:
  - `dropTableId`, via `event.target.closest(".react-flow__node")`'s
    `data-id` — the table under the drop, if any (`null` distinguishes
    "dropped on a table" from "dropped on the empty pane," which xyflow's
    own `toNode` cannot).
  - `dropColumnId`, via `event.target.closest(".react-flow__handle")`'s
    `data-handleid`, decoded through a new `sourceColumnIdFromHandle`
    (`columnHandleId.ts`, alongside the existing `columnIdFromHandle`) —
    `null` unless the drop landed specifically on another column's
    _source_ handle (a `target`-type/key handle hit, or no handle at all,
    both decode to `null`).
  - Given those: a resolved existing column (other than the one being
    dragged from) → `{ kind: "existingColumn", ... }`; a resolved table but
    no column → `{ kind: "newColumn", ... }`; anything else (no table
    resolved, or dropped back on the origin column itself) → `null`.
- `Canvas.tsx`'s `onConnectEnd` dispatches on the result: `existingColumn`
  calls the same `onAddForeignKey` the original 0009 gesture already uses
  (just with the roles determined by this reversed gesture); `newColumn`
  calls the new `onAddForeignKeyWithNewColumn` (below).

Both DOM lookups stay inline in `Canvas.tsx`, not extracted or unit-tested —
matching this file's existing, already-accepted precedent that `onConnect`
and `isValidForeignKeyConnection` have no direct interaction test either
(only rendering/selection behavior is covered by story-driven tests). The
decision logic that consumes their results is what's pulled into
`resolveForeignKeyDrop` for testing.

### Self-reference, including to an existing column

Dropping back onto the same table the drag started from — whether landing
on the table's body (new column) or precisely on one of its own _other_
existing columns (`existingColumn`) — is a legitimate self-referential FK
and needs no special-casing, the same precedent 0009 established for
self-referencing FKs created via the original gesture.

### Drop-target highlighting

`TableNode` calls xyflow's `useConnection` hook with a selector,
`isKeyColumnDragInProgress` (new file `TableNode/dropTarget.ts`, pure and
unit-tested), that returns whether the in-progress connection started from a
`target`-type handle. Every table node re-renders only when this boolean
flips (xyflow's selector-based re-render scoping), not on every pointer-move
tick.

Calling `useConnection` directly inside `TableNode` — rather than computing
this once in `Canvas` and threading it through node `data` — matches
xyflow's own recommended pattern for this exact use case (their hook's own
doc comment: _"colorize handles based on a certain condition"_) and avoids
forcing `Canvas`'s `tablesToNodes` to recompute and reconcile the whole node
array on every high-frequency drag tick, which passing it through `data`
would require.

When true, the table's card gets a new `dropTarget` variant (dashed accent
border + tinted background, alongside the existing `selected` variant in the
same `tv()` config) **and** a short text line, rendered inside the card —
not a color change alone, so the affordance doesn't depend on distinguishing
a border color/style from the existing `selected` treatment. The text names
both outcomes rather than only the auto-create one: "Drop on a column to
link it, or here to add a new one."

That text line is positioned `absolute`, anchored above the card
(`bottom-full`), rather than laid out inline before the column list. An
earlier inline version added real height to the card whenever a drag
started, which pushed every column row — and its handle — down by that
amount; a drag that started while eyeing a handle's idle position would then
have that handle physically move out from under the pointer the moment the
drag began, undermining the precise-drop case above. Positioning it outside
the card's own box means its appearance can never reflow anything a drag
depends on.

### Naming pattern (new column)

The generated name is `` `${referencedTable.name}_${referencedColumn.name}` ``
(e.g. table `users`, column `id` → `users_id`). Both parts are already
enforced to be valid SQL identifiers by the time they can be referenced here
(table and column creation both validate via `isValidIdentifierName`), so the
underscore-joined concatenation is itself guaranteed to be a valid
identifier — no additional validation call is needed at the join point.

No pluralization/singularization is attempted (i.e., the result is
`users_id`, not `user_id`) — see Alternatives Considered.

### Collision handling (new column)

Every other column name in this codebase is either user-typed (and a
collision is rejected by `addColumn`'s existing silent no-op, which a human
notices and can just retype) or doesn't need generation at all. A
programmatically generated name has no such "notice and retry" moment, so
silently no-opping on collision would make the whole gesture silently fail
with no feedback. Instead, the generated name is auto-suffixed on collision
(`users_id`, then `users_id_2`, `users_id_3`, ...) via a small new
`uniqueColumnName` helper in `schema.ts`. This mirrors the shape (not the
code) of `uniqueIndexName`'s dedup loop in `src/domain/sqlite/generateDdl.ts`
— that helper solves the same kind of problem but for generated index names
during SQL export, a different module and concern, so it isn't reused
directly.

### New column defaults

- `type`: copied from the referenced (parent) column's type. Always a valid
  value since there's currently only one dialect (SQLite) and every existing
  column's type is already one of `SQLITE_COLUMN_TYPES`.
- `size`, `defaultValue`, `comment`: empty string.
- `nullable`: `true`.
- `autoIncrement`: `false` (never valid on a column that isn't a table's sole
  PRIMARY KEY).
- Placement: appended at the end of the target table's column list, matching
  `addColumn`'s existing append-only behavior — no special ordering.

### Domain composition (new column)

One new domain function, `addForeignKeyWithNewColumn`, composes `addColumn`
then `addForeignKey` internally (both already exist, unchanged) rather than
the view layer calling them as two separate steps with a pre-generated id
threaded between them — the pattern 0007 used for "column + key membership
created in the same submit." That pattern exists there because the view
needs the generated column's id back for a second, independent user-facing
action (setting key membership from a dialog). Here nothing outside this one
call needs the id, so a single combined function is simpler: one
`setCurrentSchema` call, one `updatedAt` timestamp, and self-reference falls
out for free since `addForeignKey`'s internal checks run against the
already-updated intermediate schema (the newly added column already exists
by the time it's referenced).

The `existingColumn` case needs no new domain function at all — it calls the
same `addForeignKey`/`onAddForeignKey` the original 0009 gesture already
uses.

## Alternatives Considered

- **Relying on xyflow's native reversed `onConnect`** for the
  existing-column case — rejected: doesn't reliably fire for a
  target-handle-origin drag ending on a source handle in practice; even if
  it did, having two independent code paths (native `onConnect` and
  `onConnectEnd`'s own resolution) both capable of adding the same FK is a
  duplication/double-fire risk not worth carrying. Explicitly disabling it
  via `isValidConnection` and handling the whole gesture in one place
  removes that risk entirely.
- **View-layer composition** (`onAddColumn` + `onAddForeignKey`, pre-generated
  id threaded through, mirroring 0007's dialog pattern) for the new-column
  case — rejected: nothing else needs the generated column's id back, so a
  single domain function is strictly simpler with no loss of capability.
- **A dedicated new `Handle`/visual affordance for "drag to create a linked
  column"** — rejected: the existing key handle already supports starting a
  drag outward (`isConnectableStart` defaults `true`), so a second handle
  would only add visual clutter for a capability that already exists on the
  current one.
- **Singularizing the referenced table name** (`user_id` instead of
  `users_id`) — rejected: needs an English pluralization dependency for
  marginal naming aesthetics; plain concatenation needs none and is
  trivially correct for any table name in any language.
- **Rejecting a name collision with a `notify()` message** instead of
  auto-suffixing — rejected: the name is generated, not typed, so there is no
  "notice and retry" gesture for a human to perform in response to a
  rejection; auto-suffixing is the only resolution that doesn't leave the
  gesture silently doing nothing.
- **Color-only drop-target highlighting (border/background, no text)** —
  rejected: the original problem was exactly that the gesture wasn't
  visually obvious; relying on a subtle border color risks the same
  complaint recurring for users who don't immediately register the color
  change during a fast drag.
- **Highlighting only tables other than the drag's origin table** —
  rejected: dropping back on the same table is a legitimate self-reference,
  so excluding the origin table would visually contradict what the gesture
  actually allows.

## Open Questions

- Whether REQ-032, once built, should let this doc's hardcoded naming
  pattern become one of several selectable templates, or replace it
  outright.
- Whether touch-drag precision for this specific gesture is worth solving
  later if mobile/tablet use becomes a real usage pattern.
- Whether this same drop-target highlighting treatment should extend to the
  still-open REQ-004 (multi-select) or REQ-003 (zoom) work later, if those
  introduce their own in-progress-gesture feedback needs — no action needed
  now.
