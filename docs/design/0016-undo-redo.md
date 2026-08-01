# Undo / Redo

- **Status**: Implemented
- **Created**: 2026-07-31
- **Updated**: 2026-08-01

## Context

REQ-005 is the last unimplemented item in the "Diagram editing (canvas)"
group. Every diagram mutation already flows through one place —
`useSchemaWorkspace`'s `currentSchema` state, updated by `setCurrentSchema`
calls inside each action — which is precisely what
[0011](0011-main-screen-state-composition.md) predicted would make undo/redo
tractable without a store library, and what
[0015](0015-multi-select-and-group-move.md) built `moveTables` around ("the
natural granularity for REQ-005's later undo/redo: one undo step per drag
gesture, not N partial ones").

Two things make the design non-trivial despite that groundwork: deciding
which of the workspace's many actions are "diagram edits" versus "which
document is open" (only the former should be undoable), and what happens to
selection state when undo/redo jumps the schema to a point where a currently
selected id no longer exists.

## Goals / Non-Goals

**Goals**

- Undo/redo for diagram-content edits: table create/rename/comment/move/
  delete, column add/edit/remove, key add/edit/remove, column key-membership
  changes, and foreign-key create/remove (including the auto-generated-column
  variant).
- One undo step per user gesture, matching the granularity `moveTables`
  already established for group drags (one step for an N-table group move,
  one step for a compound "create FK + generate child column" action).
- Toolbar buttons (disabled when nothing to undo/redo) and keyboard shortcuts.
- Selection left in a valid state after an undo/redo jump — never referencing
  a table/column/key/relation id that the jump removed.

**Non-Goals**

- Undoing workspace-level actions: creating, switching, renaming, or deleting
  a _schema document_, or loading one from a file. These operate above the
  diagram-content level; see Design.
- Persisting undo history across a reload or a schema switch. History is
  in-memory only, like React state elsewhere in this app.
- Undo/redo for canvas view state (zoom, pan, selection) — only domain
  content is versioned.
- A configurable history depth (that belongs with REQ-032, persisted
  settings, if it's ever wanted). A fixed cap is enough here.
- Resolving the two-call add-column-then-set-key-membership sequence flagged
  in [0011](0011-main-screen-state-composition.md)'s Open Questions. It still
  produces two undo steps for what a user perceives as one action; folding it
  into a single workspace action is tracked there, not here.

## Design

### Undoable edits vs. workspace-level actions

`useSchemaWorkspace`'s actions split into two groups by what they touch:

- **Diagram-content actions** — everything listed under Goals — replace
  `currentSchema` with a new value derived from the previous one via a domain
  transform, and are the only actions that push history.
- **Workspace-level actions** — `createSchema`, `loadSchemaFromFile`,
  `selectSchema`, `renameSchema`, `deleteCurrentSchema` — decide _which
  document_ `currentSchema` points at (or rename it). They bypass history
  entirely: switching documents clears both stacks (a snapshot from a
  different document is meaningless once it's gone), and `renameSchema`
  neither pushes nor clears, since a name change isn't diagram content and
  undoing through it shouldn't also revert the name (see "Restoring a
  snapshot" below for how that's kept true).

### One interception point: `updateSchema`

Every diagram-content action already computes its next schema and calls
`setCurrentSchema`, and several already no-op (return the same `prev`
reference) when the edit has no effect — `renameTable` on an unchanged name,
`moveTable(s)` on unchanged positions, etc. Rather than adding push-to-history
calls at each of the fourteen call sites, they route through one wrapper:
compute `next`, and if `next !== prev`, push `prev` onto the undo stack and
clear the redo stack before committing `next`. The existing no-op checks are
reused for free — an action that no-ops never touches history, with no new
per-action logic.

The undo stack is a capped array (bounded, e.g. 100 entries, dropping the
oldest) held alongside `currentSchema` in `useSchemaWorkspace`, not a new
context — it needs direct access to the same setter and previous-value
reference the workspace already owns.

### Restoring a snapshot

`undo()` pops the last entry, pushes the current schema onto the redo stack,
and restores the popped one; `redo()` is the mirror. Both no-op when their
stack is empty.

A popped snapshot is not applied verbatim. It carries whatever `id`, `name`,
and `createdAt` were current _at the time that history entry was recorded_ —
which is right for `id`/`createdAt` (they never change) but wrong for `name`
if a `renameSchema` happened after that point, since renaming is explicitly
not part of undo history. Restoring the content fields from the snapshot
while keeping the current document's `id`/`name`/`createdAt`, and stamping a
fresh `updatedAt`, keeps that true and keeps the autosave path honest: from
storage's perspective, an undo is a new edit to the open document and should
sort and persist like one, not like a jump backwards in time.

### Selection is cleared, not reconciled

An undo/redo jump can remove a table, column, key, or relation that is
currently selected (undoing its creation, or redoing its deletion). Rather
than reconciling every selection setter against the post-jump schema on
every render, `undo`/`redo` simply clear all selection unconditionally, the
same way a schema switch already does in `SelectionContext`. What was
selected before a history jump is not a meaningful concept to preserve across
it, so there's nothing lost by clearing rather than trying to carry
selection forward when it happens to still resolve.

### A React Flow reconciliation hazard, and why React Flow now owns selection outright

Driving the app confirmed a real failure mode the design above didn't
anticipate: undoing (or redoing) while a table is selected could make React
Flow's controlled-selection reconciliation oscillate — its
`onSelectionChange` callback reporting the node alternately selected and
not, each report processed by this app and fed back into the
`selectedTableIds`/`nodes` props React Flow reads, producing another
contradicting report.

**The cause sits entirely inside React Flow, not in this app's state.**
Deselecting a table shortly after (not necessarily in the same commit) a
`tables` change that made React Flow re-measure the affected nodes could
trigger it. The pattern reproduced identically no matter how `Canvas`'s
controlled `nodes` array was built, memoized, or given stable object
identity, and identically regardless of whether the deselection landed in
the same React commit as the schema change or a separate one — which is
what places the cause inside React Flow's own reconciliation rather than in
anything under this app's control. (The oscillation itself was bounded, not
literal-infinite — it resolved on its own after roughly a dozen rapid
reports, well under 100ms; earlier manual testing that looked like runaway,
tab-freezing behavior was mis-measured, since `requestAnimationFrame`-based
FPS sampling doesn't reveal churn happening below one frame. A precise
`MutationObserver` + timestamped echo log was what actually confirmed the
bound.)

Two fixes were tried that treated the symptom — forcing `clearSelection`
into its own commit via `flushSync`, then a pattern-agnostic oscillation
detector paired with a doubly-deferred `clearSelection` (see Alternatives
Considered for both, and why each looked complete but wasn't). Both worked
around a specific echo shape rather than removing the thing producing
echoes in the first place: this app writing `selectedTableIds` into
`nodes[].selected` on every resync, in a tug-of-war with React Flow's own
idea of which nodes are selected.

**The actual fix removes that tug-of-war**: `Canvas` no longer computes
`.selected` from app state on an ongoing basis at all. React Flow owns
which table nodes are selected as its own internal (uncontrolled) state,
driven entirely by its own click/shift-click/rubber-band handling; this app
only reads that state back out through `onSelectionChange`, and never
writes it back in except once, at the very first mount (see below). With
nothing to reconcile against, the reconciliation hazard has no input to
oscillate on.

This shifts two things that used to be trivial into their own small
mechanisms:

- **Programmatic deselection** (undo/redo clearing selection after a
  history jump) can no longer set a prop — there's no controlled prop left
  to set. `CanvasApiContext` is a page-scoped ref (`CanvasApi`, currently
  just `deselectAllTables`) that a `CanvasApiBridge` component — a child of
  `<ReactFlow>`, needed to reach its store via `useStoreApi()` — registers
  on mount. `deselectAllTables` calls React Flow's own native
  `store.getState().unselectNodesAndEdges()`, the same internal path a
  user's own Escape or pane-click already drives, instead of this app
  trying to model deselection itself. `useUndoRedo` calls it (alongside
  `clearSelection`, for column/key/relation) after every `undo`/`redo`; no
  deferral of any kind is needed since there's no oscillation to outlast.
- **Seeding an initial selection** (stories, tests that start with a table
  already selected) can't go through `SelectionContext`'s normal seeding
  path unmodified, because React Flow always echoes its actual (empty)
  selection once on mount regardless of what this app seeded — a
  pre-existing, already-relied-on behavior (see
  [0015](0015-multi-select-and-group-move.md)). Left alone, that echo
  reaches `SelectionContext.setTableSelection`, which — correctly, for a
  real click — clears column/key selection whenever the table selection
  changes; a seeded selection bouncing through "echoed empty, then
  corrected" looks exactly like a real change and loses whatever column/key
  was also seeded. Rather than special-casing that guard, `Canvas` accepts
  an `initialSelectedTableIds` prop read only by `useNodesState`'s lazy
  initializer — invoked exactly once, before React Flow exists to own
  anything — so the very first node array already carries the correct
  `.selected` values and React Flow's mount-time echo reports a selection
  that matches the seed from the start. Nothing bounces, so there's nothing
  to guard against.

One more consequence of dropping the ongoing resync of `.selected` needed
its own fix: `Canvas`'s resync effect rebuilds every node from `tables`
on _any_ schema edit (not just ones touching the selected table), so
without carrying `.selected` forward explicitly, an edit made while a table
was selected would silently deselect it. The resync effect now reads which
node ids are currently selected off the outgoing node array before
rebuilding, and re-applies that same set to the freshly built one — the
only place in the app that reads `.selected` back out of React Flow's own
state, and only to carry it through a rebuild it would otherwise be lost
in, never to compute it from `tables`.

`Canvas`'s node-resync effect also carries each node's already-measured
`measured` dimensions forward across a resync instead of dropping them
(`tablesToNodes` never sets it). Discarding it on every resync made React
Flow treat every node as freshly mounted on every edit, hiding it
(`visibility: hidden`) until it was re-measured — and, if another resync
landed before that remeasurement completed, discarding the fresh
measurement too. This was reachable (nodes could be left permanently
invisible) even independent of the selection hazard, since a resync only
requires _some_ diagram edit, not a selection change.

### Exposing the controls

`undo`, `redo`, `canUndo`, and `canRedo` are exposed from
`SchemaWorkspaceContext` as their own hook face, alongside the existing
`useCurrentSchema` / `useSavedSchemas` / `useSchemaActions` split — history
control is conceptually distinct from the domain mutators in `SchemaActions`,
so it gets its own consumer rather than being folded into that type.

The toolbar (already home to the schema and table actions) gains Undo/Redo
buttons, disabled via `canUndo`/`canRedo`. Keyboard shortcuts (Ctrl/Cmd+Z,
Ctrl/Cmd+Shift+Z) land in their own hook next to `useDeleteKeyShortcut`,
continuing the extraction [0011](0011-main-screen-state-composition.md)
started so REQ-031's shortcuts have one place to accumulate rather than
growing inside `MainScreenView`.

## Alternatives Considered

- **Command/inverse-operation history** (store an inverse action per edit
  instead of a full schema snapshot) — rejected: it would require every
  domain mutator to also define and maintain its inverse, real ongoing cost,
  for schemas small enough that snapshotting the whole document is cheap.
- **A store library with time-travel middleware** (redux + redux-undo, a
  zustand middleware) — rejected for the same reason
  [0011](0011-main-screen-state-composition.md) and
  [0002](0002-schema-persistence-and-creation.md) rejected a store library
  generally: it introduces a second state-management idiom into a single-page
  app with no measured problem the current one can't solve.
- **Persisting undo history in browser storage** — rejected: REQ-005 doesn't
  ask for undo to survive a reload, and persisting it would grow the saved
  payload and reopen "which snapshot is truth" questions the autosave path
  already answers cleanly with a single `currentSchema`.
- **Reconciling selection against the post-jump schema** (drop only the ids
  that no longer resolve, keep the rest) instead of clearing all of it —
  rejected: it requires a general existence-check pass wired into every
  selection setter for a case that only two call sites (`undo`, `redo`)
  actually produce; clearing at those two points is simpler and no less
  correct given selection-after-a-jump isn't a meaningful thing to preserve.
- **Fixing the React Flow reconciliation hazard (above) by changing how
  `Canvas` builds its controlled `nodes` array** — tried several variants
  (routing selection through discrete `select`-type `NodeChange`s instead of
  a full array replace, giving unaffected nodes stable object identity
  across a resync via a `WeakMap` keyed on the source `Table` object,
  memoizing `edges`, blurring the selected node's element before clearing)
  and none changed the failure at all: the reproduction was byte-for-byte
  identical regardless. That ruled out this app's node-array construction as
  the cause and pointed at React Flow's own reconciliation instead.
- **Forcing `clearSelection` into its own commit via `flushSync`, run
  _before_ `undo()`/`redo()`** — the first fix attempted. It reliably
  stopped the specific reproduction that motivated it, but a harder,
  MutationObserver-driven retest of the same steps that prompted this whole
  investigation showed the oscillation still occurring, just from
  `clearSelection` itself rather than from `undo`/`redo`'s schema change —
  the trigger was never specifically "in the same commit," and reordering
  which commit things landed in didn't avoid it. Superseded by deferring
  `clearSelection` well past when React Flow's reconciliation actually
  settles (see above), which testing showed reordering alone did not
  achieve.
- **A single deferred `clearSelection`** (one pair of `requestAnimationFrame`s,
  no follow-up) — insufficient on its own: two animation frames is not
  reliably past the oscillation window, and `Canvas`'s `isOscillating` guard
  can only stop the runaway forwarding, not guarantee which of the two
  states it stops on. A second, later correction is what makes the final
  state reliably "deselected" rather than leaving it to chance.
- **Matching the oscillation's exact echo pattern** (the first version of
  `isOscillating`, requiring a strict two-state A,B,A,B alternation) —
  rejected once retesting showed a different edit produced a three-state
  A,A,B cycle that a period-2 matcher never recognizes at all. Replaced with
  a pattern-agnostic "few distinct states, reported abnormally fast" check.
- **Keeping the pattern-agnostic `isOscillating` detector plus the
  doubly-deferred `clearSelection` as the permanent fix**, instead of
  removing the ongoing `.selected` write-back that produced the echoes —
  this is what shipped first, and it did work, but only by suppressing a
  symptom it could detect rather than removing its cause: a bespoke
  detector (two tunable constants, `OSCILLATION_MAX_DISTINCT` and
  `OSCILLATION_MIN_REPORTS`) racing a bug it couldn't fully characterize
  (the pattern-matching miss above), plus a 200ms magic-number correction
  delay with no principled derivation beyond "long enough in testing."
  Superseded once it became clear the only reliable fix was to stop feeding
  app state into `nodes[].selected` on an ongoing basis at all (see Design)
  — after which the detector and its constants became dead code and were
  deleted (`nodeChanges.ts`).
- **Seeding an initial selection via an imperative `CanvasApi` method**
  (`selectTableNodes(ids)`, called from a mount effect once `Canvas` had
  registered its API, mirroring `deselectAllTables`) — tried first for
  seeding, and it did correctly restore table selection, but it did so by
  driving the exact same path a real click drives:
  `onSelectionChange` → `SelectionContext.setTableSelection`. React Flow's
  mount-time echo (of the actual, still-empty selection) reaches that path
  first and clears column/key selection as part of what looks like a real
  table-selection change; the imperative call then restores the table
  selection through the same guarded setter, which — correctly, by its own
  logic — doesn't re-clear column/key on this second pass, so they stayed
  lost. A story or test seeding a table _and_ a column together (several
  do) would end up with the column selection silently dropped. Replaced by
  seeding through `useNodesState`'s one-time initializer instead (see
  Design), which avoids the round trip entirely rather than working around
  it.

## Open Questions

- Should `deleteCurrentSchema` (removing the whole document) be reachable
  through undo at all? It's currently grouped with the workspace-level
  actions and out of scope, but it's the one action in that group that's
  destructive in the same way diagram edits are. Left as-is for now since
  REQ-005 sits under "Diagram editing," not schema management, and
  [0003](0003-schema-selection-rename-delete.md) doesn't ask for it either.
