# E2E Testing with Playwright

- **Status**: Accepted
- **Created**: 2026-08-04
- **Updated**: 2026-08-07

## Context

`docs/rules/testing.md` was deliberately designed around a future 3-layer
testing setup: unit tests today, VRT (visual regression, snapshotting
Storybook stories) and E2E (real browser) later. jsdom-hard interactions —
canvas drag, rubber-band multi-select, foreign-key connection drawing — were
explicitly carved out of unit-test scope with the intent of covering them via
that future E2E layer. That layer was never built: there is no Playwright
config, no `e2e/` directory, and no CI at all in the repo.

At the same time, all 26 existing design docs are `Implemented` and every
requirement in `docs/requirements.md` links to one, so there is no
outstanding feature work. This doc is pure test infrastructure, not a new
user-facing feature — it has no `REQ-NNN` to link from (precedent:
[0011](0011-main-screen-state-composition.md) is also a pure architecture
doc not referenced from `docs/requirements.md`).

As a result, some of the app's most central interactions currently have
**zero automated coverage**: table drag (REQ-001), multi-select with group
move (REQ-004), and foreign-key connection drawing (REQ-014, REQ-015).

The first implementation attempt built all three flows in one round and
turned out flaky. Rather than debug that implementation in place, the specs
were reset to comment-only outlines (one comment per intended
action/assertion) and the page objects to empty classes; the rebuild is
proceeding scenario by scenario, and a spec only gets real code once its
page-object methods are written and the spec passes repeatedly
(`--repeat-each`) without flaking. As of this update, `MainScreenPage` has
been rebuilt with `tableNode`, `addTable`, `selectTable`, `openSidePanel`,
`tableColumnRow`, plus a nested `SidePanel` class (exposed as
`MainScreenPage.sidePanel`, with `addColumn`, `columnNames`, `keyLabels`) —
enough to drive a new `table-and-column-creation.spec.ts`, chosen first
because it needs neither pointer-drag nor keyboard-modifier gestures. The
three flows above are still comment-only stubs: none of the drag,
box-select, shift-click, or connect-columns page-object methods described
in the Design section below exist yet. That section is retained as the
target design and as notes carried forward from the first attempt, not as a
description of current code — it needs re-verification (including whether
it explains the flakiness) as each flow is rebuilt.

## Goals / Non-Goals

**Goals**

- Stand up Playwright (Chromium only) against the Vite dev server.
- Cover three representative, highest-risk flows: table creation + drag
  persistence, multi-select (shift-click and rubber-band) + group move, and
  FK connection drawing with generated child column.
- Establish selector and state-isolation conventions, and a Page Object
  Model structure, for future E2E specs to follow.

**Non-Goals**

- CI wiring (no GitHub Actions workflow this round — the repo has no CI at
  all today; adding one is a separate, later decision).
- Broader flow coverage: undo/redo, table deletion, keyboard shortcuts,
  snap-to-grid, zoom. Explicit follow-ups, not built now.
- A multi-browser matrix (Firefox/WebKit).
- Folding `pnpm test:e2e` into `pnpm test` or into
  `docs/rules/pre-commit-checks.md`'s required sequence.

## Design

### Tooling and `webServer` strategy

`@playwright/test`, installed as a devDependency, with a single `chromium`
project. This round is about proving the harness and locking in three flows,
not cross-browser regression coverage — a multi-browser matrix is cheap to
add later once the pattern is proven.

`playwright.config.ts`'s `webServer` runs `pnpm dev` (the existing Vite dev
server, no custom port/proxy/base in `vite.config.ts`) rather than
`vite build` + `vite preview`. The app has no backend and no
environment-dependent build output, so a production build buys no extra
correctness here, only slower iteration. `reuseExistingServer:
!process.env.CI` lets a developer keep `pnpm dev` running across repeated
`test:e2e` runs locally. Revisiting this for `build`+`preview` is left as an
Open Question for whenever CI is added.

### Directory layout and Page Object Model

```
e2e/
  fixtures/
    cleanStorage.ts
  pages/
    MainScreenPage.ts        (includes a nested, non-exported SidePanel class)
  specs/
    table-and-column-creation.spec.ts
    table-creation-and-drag.spec.ts
    multi-select-group-move.spec.ts
    fk-connection-drawing.spec.ts
```

Root-level `e2e/`, not colocated under `src/`: `docs/rules/testing.md`'s
colocation rule (`Table.tsx` → `Table.test.tsx`) assumes a 1:1 test-to-source
relationship. An E2E scenario spans MainScreen, Canvas, TableNode, and the
storage repository at once — there is no single source file to colocate
next to.

The Page Object Model is adopted from this first round. `e2e/pages/` holds
plain classes (`new MainScreenPage(page)`) that encapsulate every locator and
gesture behind intent-named methods (`addTable(name)`, `selectTable(name)`,
and — once rebuilt — `dragTableNode(name, dx, dy)`, `shiftClickSelect(names)`,
`boxSelect(from, to)`, `connectColumns(...)`). `e2e/specs/` holds the
scenario files, which call only page-object methods and assert outcomes —
they read as a sequence of user actions, not raw Playwright locators.
`playwright.config.ts`'s `testDir` points at `./e2e/specs`.

- **`MainScreenPage`** — toolbar (add table) and canvas (`.react-flow__pane`,
  node/handle locators, drag and box-select gestures, selection-state
  queries).
- **`MainScreenPage.sidePanel`** (a private `SidePanel` class nested in
  `MainScreenPage.ts`, not its own page object — the side panel never
  navigates to independently and can already be open when a spec starts, so
  it's a component owned by the screen rather than a screen of its own) —
  the table detail panel (column/key management, relation list), needed to
  assert FK/child-column creation in the third scenario.

No fixture-based auto-injection of page objects yet — each spec constructs
what it needs directly. Revisit if/when Playwright fixtures would meaningfully
reduce boilerplate across a larger spec count.

### tsconfig and Vitest isolation

`tsconfig.node.json`'s `include` (currently `["vite.config.ts"]`) gains
`playwright.config.ts` and `e2e`. That config already runs in a Node context
with no DOM lib, matching Playwright's own typings — no new project
reference is needed. `e2e/**` must **not** be added to `tsconfig.app.json`:
its `types` array pulls in Vitest's global `describe`/`it`/`expect`, which
would collide with Playwright's own imported `test`/`expect`.

Separately, `vite.config.ts`'s `test` block has no `include`/`exclude`
override today, so Vitest's default glob (`**/*.{test,spec}.*`) would match
`e2e/specs/**/*.spec.ts`. `test.exclude` gains
`[...configDefaults.exclude, "e2e/**"]` (`configDefaults` imported from
`vitest/config`) so the two test runners stay strictly separated.

### Scripts and the pre-commit gate

`package.json` gains `test:e2e` (`playwright test`) and `test:e2e:ui`
(`playwright test --ui`, for local interactive debugging — mirrors
`test:watch` existing alongside `test`). Neither is folded into `pnpm test`
or `docs/rules/pre-commit-checks.md`'s required sequence: that gate is
designed to be fast and deterministic enough to run before every commit,
while Playwright spins up a real browser and dev server — materially slower
and more timing-sensitive than jsdom, and irrelevant to commits that don't
touch canvas interactions. `pre-commit-checks.md` gains a one-line note that
`test:e2e` is intentionally excluded, so its absence doesn't read as an
oversight.

### Selector strategy — no new `data-testid`

Every locator resolves against attributes that already exist for functional
reasons, keeping E2E selector philosophy consistent with
`docs/rules/testing.md`'s existing role-based-query preference for unit
tests:

- Table node: `page.getByRole("button", { name: <table name> })` —
  `TableNode.tsx` renders the node's root as
  `<button aria-label={t("ariaLabel", {name})}>`. React Flow also exposes
  `.react-flow__node[data-id="<tableId>"]` when disambiguation by id is
  needed.
- Drag (single node or a multi-selected group): React Flow drives dragging
  with pointer events, not native HTML5 drag-and-drop, so Playwright's
  high-level `dragTo()` (built for native DnD) is unreliable here. Page
  objects use `mouse.down()` → `mouse.move(x, y, { steps: 10 })` →
  `mouse.up()` — multiple intermediate steps so React Flow's internal
  drag-threshold handling registers each tick, not just start and end.
  **Implementation-discovered gotcha**: React Flow drops the first
  pointermove segment of a drag, so an interpolated move straight to the
  target lands short by roughly `1/steps` of the total distance (e.g. ~10%
  short with `steps: 10`). `MainScreenPage`'s `primeDrag` helper issues a
  1-2px no-op move immediately after `mouse.down()` to absorb that loss
  cheaply before the real move, used by both `dragTableNode` and
  `connectColumns`. Separately, the _committed_ position React Flow reports
  through its position-change event (what actually gets saved) can still
  land a few extra pixels short of the live drag render on the axis
  affected by the toolbar's vertical offset — a library discretization
  detail distinct from the dropped-first-segment issue above, not a
  persistence bug. Position assertions comparing a reload against the
  pre-reload drag render (rather than against the originally-requested
  delta) use a wider tolerance (20px vs 5px) for this reason.
- Multi-select accumulate (shift+click): `Canvas.tsx` sets
  `multiSelectionKeyCode="Shift"` — click the first node, then
  `keyboard.down("Shift")` + click the second + `keyboard.up("Shift")`.
- Rubber-band (box) select: React Flow's default `selectionKeyCode` is also
  `"Shift"`, and `Canvas.tsx` doesn't override `panOnDrag` (default `true`)
  or `selectionOnDrag` — so holding Shift while dragging on
  `.react-flow__pane` background triggers box-select instead of pan.
  Selection state is asserted via `.react-flow__node.selected` count.
  **Implementation-discovered gotcha**: React Flow's own bottom-corner
  overlay panels (MiniMap, Controls, Attribution link) sit on top of the
  pane and are not descendants of it — a mousedown that lands on one of them
  is swallowed by that panel instead of starting a selection, silently
  no-op'ing the whole gesture. `boxSelectPane` callers must pick a start
  point clear of those panels (e.g. the pane's vertical middle, away from
  its bottom edge); the end point can safely land anywhere, including on a
  node, since React Flow's own pointer capture keeps subsequent move/up
  events routed to the pane once the drag has genuinely started there.
- FK connection: per-column `<Handle>` elements expose
  `.react-flow__handle[data-handleid="source:<columnId>"]` (child/source
  side) and `[data-handleid="target:<columnId>"]` (parent/target side,
  conditionally rendered — only referenceable columns get one), ids built by
  `columnHandleId.ts`. Same low-level pointer sequence as node drag; the
  final `mouse.move` must land exactly on the target handle's bounding-box
  center before `mouse.up()`, since `Canvas.tsx`'s connection-end handling
  reads the drop target at pointerup. Success is asserted two ways: a new
  `.react-flow__edge` appears (the visual product of the gesture), and the
  child table's relation list in the side panel shows the new FK/generated
  child column (the actual product — REQ-016/REQ-017,
  [0012](0012-foreign-key-child-column-generation.md),
  [0013](0013-foreign-key-type-propagation.md)).

### State isolation

Each spec's `test.beforeEach` calls `resetAppState` (`e2e/fixtures/cleanStorage.ts`):

```ts
await page.goto("/");
await page.evaluate(() => window.localStorage.clear());
await page.reload();
```

This navigates once, clears storage, then reloads so the app's "no
last-schema pointer → auto-create a blank schema" flow
([0002](0002-schema-persistence-and-creation.md)) runs against a clean
slate. **Implementation-discovered gotcha**: the original design used
`page.addInitScript(() => localStorage.clear())` before `page.goto("/")`
instead — but `addInitScript` re-runs on _every_ subsequent navigation in
that page, not just the first. That silently wiped storage again on a
spec's own intentional `page.reload()` after a save (used to verify drag
persistence), making the just-saved position vanish before the reload's
fresh load could read it back. The `goto` → `evaluate` → `reload` sequence
clears once, with no persistent hook left behind to interfere with later
reloads in the same test.

The FK scenario needs two pre-existing tables with a referenceable column.
Setup drives this through the UI (create tables/columns, mark a column
PK/UNIQUE via the side panel) rather than seeding the localStorage envelope
directly — this avoids coupling the E2E suite to the internal
`{version, schema}` envelope shape, which would silently break if
`STORAGE_VERSION` changes.

## Alternatives Considered

- **`vite build` + `vite preview` instead of `vite dev`** — rejected for
  this round: no behavioral difference to justify the slower iteration loop
  yet, since the app has no env-dependent build output. Revisit once CI is
  added (see Open Questions).
- **Multi-browser (Firefox/WebKit) from the start** — rejected: adds
  local/CI runtime cost before the harness and the three scenarios are
  proven; cheap to add once they are.
- **A new `data-testid` convention for canvas elements** — rejected:
  existing `aria-label`, React Flow's `data-id`/`data-handleid` are
  sufficient for all three scenarios and keep selector philosophy consistent
  with `docs/rules/testing.md`'s role-based-query preference. A future
  scenario with genuinely no accessible/structural hook should add a small,
  explicitly-justified exception at that point, not a blanket convention
  adopted preemptively.
- **Raw localStorage envelope seeding for all scenario setup** — rejected:
  couples the suite to the internal `{version, schema}` shape and
  `STORAGE_VERSION`. UI-driven setup is slower but decoupled; worth
  revisiting only if spec count grows and setup time becomes a real cost.
- **Folding `test:e2e` into `pnpm test` / `pre-commit-checks.md`** —
  rejected: breaks the fast, deterministic intent of the existing gate and
  would penalize commits unrelated to canvas interactions.
- **Deferring the Page Object Model until spec count grows** — considered,
  since only three specs exist initially and the abstraction has no proven
  payoff yet; rejected on review in favor of adopting it now, so all three
  initial specs establish the convention consistently rather than needing a
  later refactor once a fourth spec would otherwise duplicate locators.

## Open Questions

- Whether CI (when added) should run against `build`+`preview` instead of
  `dev`.
- When to expand the browser matrix beyond Chromium.
- Whether raw-envelope seeding becomes worth the coupling once spec count
  grows enough that UI-driven setup dominates suite runtime.
