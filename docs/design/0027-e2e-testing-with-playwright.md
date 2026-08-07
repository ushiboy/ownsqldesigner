# E2E Testing with Playwright

- **Status**: Implemented
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
action/assertion) and the page objects to empty classes, and the rebuild
proceeded scenario by scenario: each spec only got real code once its
page-object methods were written and the spec passed repeatedly
(`--repeat-each`, 40-160 runs depending on the scenario) under Playwright's
default parallelism — not just a serial repeat, since that turned out to
matter (see below). All four specs (`table-and-column-creation`,
`table-creation-and-drag`, `multi-select-group-move`'s three scenarios,
`fk-connection-drawing`) are now rebuilt this way. Two real, non-obvious
findings came out of the process:

- **Table drag position assertions must not compare a live post-drag render
  against a reload, even with a generous tolerance.** Diagnosed via direct
  `localStorage` inspection: a reload's rendered position always equals
  `paneOffset + storedPosition` exactly — reload introduces no drift itself.
  The drift is entirely pre-reload: the live render right after
  `mouse.up()` already disagrees with the value actually committed to
  state, by a few px on the axis affected by the toolbar's vertical offset
  — confirmed stable after waiting (not a settling/animation artifact) and
  not proportional to drag distance (not a scaling error). Under
  `fullyParallel: true`'s default worker count this gap also grows and gets
  noisier with contention (single digits px serial in isolation, 21-24px
  observed over 100 runs under full parallel load), so no fixed tolerance
  tuned against a quiet machine is safe. Fix: compare two _consecutive
  reloads_ to each other (both rendered purely from storage, no live drag
  involved) instead — 0px stable across 40+ runs under full parallel load.
  See the rewritten Drag bullet under Selector strategy.
- **FK connection dragging didn't need the same treatment.** `connectColumns`
  moves the pointer to the target handle's actual on-screen coordinates
  (not a `start + delta` offset the way table dragging does), so
  Playwright's `mouse.move(x, y, { steps })` always lands exactly on that
  literal endpoint regardless of intermediate step count — a
  straightforward implementation passed 100/100 runs under full parallel
  load with no precision workaround needed.

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
    geometry.ts               (Position type, distance() — shared by drag specs)
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
`dragTableNode(name, dx, dy)`, `shiftClickSelect(names)`,
`boxSelectPane(from, to)`, `connectColumns(child, parent)`).
`e2e/specs/` holds the scenario files, which call only page-object methods
and assert outcomes — they read as a sequence of user actions, not raw
Playwright locators. `playwright.config.ts`'s `testDir` points at
`./e2e/specs`.

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
  **Don't assert against a computed target position.** The first
  implementation asserted the drag landed at `before + {dx, dy}` (plus a
  `primeDrag` helper working around React Flow dropping the drag's first
  pointermove segment, so an interpolated move lands short of that target).
  That's asserting on Playwright's pointer-simulation fidelity, not on the
  app. Instead, page objects only take a `{dx, dy}` to perform _a_ drag;
  specs read back wherever the node actually landed (`tableNodeBoundingBox`)
  and treat that as ground truth, with only a loose sanity check
  (`distance(before, afterDrag) > 50px`) that a drag happened at all.
  **Don't assert a reload matches the live post-drag render, even loosely
  tuned.** Diagnosed empirically (direct `localStorage` inspection): the
  stored position is byte-identical before and after a reload, and a
  reload's rendered position always equals `paneOffset + storedPosition`
  exactly — reload is not the source of any drift. The drift is entirely
  pre-reload: the live render immediately after `mouse.up()` already
  disagrees with what got committed to state, by a few px on the axis
  affected by the toolbar's vertical offset, confirmed stable after waiting
  (not an animation/settling artifact) and confirmed _not_ proportional to
  drag distance (not a scaling error). Under Playwright's default
  parallelism this gap is also noisy and grows with worker contention (single
  digits px serial in isolation, 21–24px observed over 100 runs under full
  `fullyParallel: true` load) — so no fixed tolerance tuned against a quiet
  machine is safe. The fix: assert reload persistence by comparing **two
  consecutive reloads** to each other (both rendered purely from storage, no
  live drag involved) instead of comparing the live drag render to a reload.
  That comparison is 0px stable across 40+ runs under full parallel load. The
  live-vs-first-reload comparison is kept only as a generous (60px) sanity
  check that persistence isn't grossly broken (e.g. silently keeping the
  pre-drag position), not as the precision check.
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
  `.react-flow__handle[data-handleid^="source:"]` (child/source side) and
  `[data-handleid^="target:"]` (parent/target side, conditionally rendered —
  only referenceable columns get one), ids built by `columnHandleId.ts` as
  `source:<columnId>`/`target:<columnId>`; `connectColumns` scopes each
  selector to its column's `<li>` row (via `tableColumnRow`) to disambiguate.
  Same low-level pointer sequence as node drag, but **no precision workaround
  needed here** unlike table dragging: `mouse.move(targetX, targetY, {
steps })` moves to the target handle's literal on-screen coordinates, not
  a `start + delta` offset, so the final step always lands exactly on that
  point regardless of intermediate step count — confirmed reliable at
  100/100 runs under full parallel load with a straightforward
  implementation. Success is asserted two ways: a new `.react-flow__edge`
  appears (the visual product of the gesture), and the child table's
  relation list in the side panel shows the new FK/generated child column
  (the actual product — REQ-016/REQ-017,
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
