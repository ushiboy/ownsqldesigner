# Main Screen State Composition

- **Status**: Accepted
- **Created**: 2026-07-26
- **Updated**: 2026-07-26

## Context

`MainScreenView` receives 41 props from `MainScreenContent` — 18 data
values and 23 callbacks. The question that prompted this doc was whether
that prop relay breaks down as Phase 2 and Phase 3 features land.

**It does not, and that is worth recording plainly.** Projecting the
unimplemented requirements onto the current shape — canvas zoom
(REQ-003), multi-select (REQ-004), undo/redo (REQ-005), column reorder
(REQ-010), file import/export (REQ-027), pre-export validation
(REQ-034) — puts the ceiling around 50 props. Multi-select changes the
_shape_ of `selectedTableId`, not the count. Dark mode (REQ-029), i18n
(REQ-030), and settings (REQ-032) are app-level providers by nature and
relieve pressure rather than adding to it.

Nor is this classic prop drilling. The relay is two hops
(`MainScreenContent → MainScreenView → Canvas`/`SidePanel`), and
`MainScreenView` consumes roughly two-thirds of what it receives itself
rather than passing it through. The pain of values traveling through
components that do not care about them is largely absent.

Three other problems _are_ real, and they are the reason to act:

**`MainScreenView` has four jobs.** It is the page layout, the host and
wiring for thirteen dialogs, the place derived values are computed, and
the owner of the global Delete/Backspace listener. The dialog wiring
alone is more than half the file. This is a cohesion defect that exists
today, independent of any future requirement.

**The story catalog can express states the app cannot produce.** Stories
hand-write `columnKeyMembershipDisabled` and `primaryKeyDisabled`. In
the running app those values are _derived_ from the selected table by
domain helpers. Nothing enforces that a story's hand-written projection
matches what the derivation would actually yield, and 27 tests assert
against those projections. REQ-013's key rules and REQ-016/017's foreign
key behavior will change the derivations; the stories will not follow.
This is the only latent defect in the current design, and the strongest
argument for change.

**[0004](0004-table-creation-and-placement.md)'s own trigger condition
has been met.** 0004 set the bar for reaching for Context — "multiple
disparate producers/consumers scattered across the tree" — and deferred
selection state because it had "exactly one producer (Canvas clicks) and
one consumer (SidePanel)". That is no longer true: selection is now
produced by the canvas, by six side-panel call sites, and by the delete
relation dialog, and consumed by the canvas, the side panel, eight of
the thirteen dialogs, and the keyboard listener.
[0006](0006-table-column-management.md) pre-authorized this exact
revision, recording that switching to Context later "is an acceptable
revision" if the prop chain became unwieldy. This is that moment, not a
reversal of the deferral.

Prop reduction is therefore a _consequence_ of this design, not its
goal.

## Goals / Non-Goals

**Goals**

- Give `MainScreenView` one job. Separate the global keyboard handling
  and the schema workspace access from the layout.
- Make the schema document and its mutators reachable without relaying
  them through the container boundary, using the page-scoped Context
  pattern [0003](0003-schema-selection-rename-delete.md) established.
- Make stories exercise the real derivation path, so a story cannot
  catalog a state the app cannot reach.
- Keep stories synchronous and deterministic, since they are the future
  visual-regression targets.

**Non-Goals**

- A store library (zustand, jotai, Redux). See Alternatives.
- Promoting any of this to app scope. These contexts are page-scoped,
  like the two that already exist.
- `SelectionContext`, the extraction of the dialog host, and derived
  value hooks. They are the designed continuation of this doc and are
  described under "Staged remainder", but are deliberately not part of
  the first change.

## Design

### `SchemaWorkspaceContext`

The result of the workspace hook — the current schema, the saved-schema
summaries, and the eighteen mutators — moves behind a page-scoped
context provided above the view, following the shape of
`ActiveDialogContext` exactly: a provider that seeds from an optional
initial value, and a hook that throws outside it.

**One provider, three hook faces.** The context exposes the current
schema, the saved schemas, and the actions as three separate hooks even
though a single provider backs them. Splitting the API now makes
splitting the provider later an internal change rather than a breaking
one.

**The provider is deliberately not split into data and mutators.** The
usual argument for that split is re-render isolation, and it does not
apply here. The workspace hook returns a fresh object of fresh closures
each render, and two of the mutators close over state they mutate, so
the mutator half could not have a stable identity without refs — the
split would buy approximately nothing. Meanwhile React Compiler, which
this project builds with, does not stop a context update from
re-rendering consumers, but it does memoize each consumer's JSX per
argument, so the subtrees that did not change bail out. The compiler
makes a coarse-grained context cheap enough that the finer split is not
worth its complexity.

### Seeding, and why it is load-bearing

The provider accepts an initial schema, documented with the same words
as the existing `initialDialog` and `initialNotification` seeds: non-null
only in stories and tests.

Seeding is not a convenience. Without it the workspace's async startup
restore overwrites the seed, which would force `waitFor` into every
currently-synchronous test and make Storybook's first frame the empty
state — a visual-regression determinism problem the testing rules
explicitly care about. So a seeded workspace **skips the restore**.

It also **skips the first auto-save**. A seeded schema is by definition
already persisted, so this is semantically right rather than a test
accommodation; it also avoids an unwrapped state update landing after
each synchronous test body ends.

### Stories seed through args, not parameters

Moving the mutators into context breaks the testing rule's idiom of
overriding a composed story's args by passing props — there is no prop
left to pass. The existing `parameters.dialog` / `parameters.notification`
channel cannot substitute, because parameters are not overridable that
way; extending it to all state would force a new story for every test
variation, which is exactly what the testing rules tell us not to do.

Stories therefore seed page state through **args consumed by a `render`
harness** that mounts the seeded container. `MainScreen.stories.tsx`
already establishes the precedent of a `render` that ignores the
component's own props and mounts a seeded wrapper. The container gains
seed props alongside the repository injection point it already
documents for this purpose.

The payoff is that the derived values stories used to hand-write now
come from the same domain helpers the app uses, closing the fidelity
gap described in Context. `docs/rules/testing.md` is amended to record
both this seeding convention and the corollary that a component owning
real state should be asserted through its resulting UI rather than
through mock calls.

### Keyboard handling

The Delete/Backspace listener and its predicates move into their own
hook. This is pure extraction — the behavior and its tests are
unchanged — but it gives REQ-031 (keyboard shortcuts) somewhere to land
that is not the layout component.

### Export DDL generation

Generating the SQLite DDL currently runs on every table mutation even
though the export dialog is closed almost always. It becomes lazy,
computed only while that dialog is open. `ExportSqlDialog` stays
presentational, receiving finished DDL, so REQ-034's validation warnings
have a place to be composed in later without coupling the dialog to the
generator.

### Staged remainder

The following are designed but deliberately deferred, so that each
change stays independently reviewable:

- **`SelectionContext`** — the four selection ids, nested inside the
  workspace provider so it can own the reset-on-schema-switch rule.
  One hazard is worth recording because it is not obvious: the current
  reset guard fires on the very first render, so moving it verbatim
  would silently clear every seeded story's selection. Its initializer
  has to be derived from the workspace rather than starting undefined.
- **Extracting the dialog host** — done _after_ the selection context,
  never before. A props-taking dialog host would need roughly thirty
  props and a story catalog that would be thrown away one step later.
- **Derived-value hooks** — reusing the existing domain helpers. They
  belong in their own module rather than in either context file, since
  they read both and the selection context already imports the
  workspace context.
- **Leaf components consuming the contexts directly**, shrinking the
  toolbar, side panel, and canvas prop lists. `isSidePanelOpen` stays a
  plain `useState` in the view — one producer, two adjacent consumers,
  which is precisely the case 0004 warned against contextualizing.
- **Folding the column-plus-key-membership handshake into one
  workspace action**, so the column id is generated below the UI. See
  Open Questions.

### Timing

Extracting the dialog host renames thirteen story ids. The testing rules
name stories as future visual-regression targets, but no baselines exist
yet. Doing this before REQ-029 (dark mode) makes visual regression
worth setting up is materially cheaper than doing it after.

## Alternatives Considered

- **Leave it alone.** Genuinely defensible on the prop count, which is
  why the projection is recorded in Context rather than hidden. Rejected
  on the other three grounds — the four responsibilities, the story
  fidelity gap, and 0004's trigger condition having been met.
- **A store library (zustand / jotai).** Selector subscriptions would
  make the granularity question permanently moot, and it is the
  strongest technical alternative. Rejected for the same reason
  [0002](0002-schema-persistence-and-creation.md) rejected it: it
  introduces a second state-management idiom into a single-page app,
  and there is no measured performance problem to justify overturning
  that decision. React Compiler weakens the performance argument
  further.
- **Splitting the context into data and mutators.** Rejected on the
  mechanics described under Design: the mutator half cannot be
  stabilized without refactoring the workspace hook around refs, so the
  split would deliver almost no re-render isolation for real added
  complexity.
- **A test-only override on the provider.** Rejected: it manufactures a
  production API that exists only for tests, and it preserves the
  mock-call assertion style this change is trying to retire.
- **Moving the affected tests into the container's test file.**
  Rejected: reaching a table-with-a-column state through the container's
  UI costs dozens of lines of driving plus an async restore, where a
  seeded workspace reaches it directly.
- **Seeding stories through `parameters` instead of args.** Rejected:
  parameters cannot be overridden per test through a composed story, so
  every test variation would need its own story.

## Open Questions

- The column-creation flow generates a UUID in the view so that the same
  submit can attach key membership to the new column. Behavioral tests
  no longer depend on that id, but it remains a determinism hazard for
  any future story with a `play` function that adds a column. Folding it
  into a single workspace action would remove both the hazard and the
  optional id parameter whose only justification is this one call site.
- `MainScreenView.stories.tsx` and `MainScreen.stories.tsx` overlap once
  the view's stories mount the seeded container. Consolidating them is
  deferred until the selection context lands and the view becomes
  propless enough to be mounted under providers alone.
