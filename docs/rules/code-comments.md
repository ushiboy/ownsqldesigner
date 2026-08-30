# Code Comments

## When

Every time you write or modify code — including checking whether comments
near the code you're touching are still accurate.

## What

This project splits explanation four ways: **code** = _how_, **tests** =
_what_, **commit messages/design docs** ([Design Docs](design-docs.md)) =
_why_, **code comments** = _why not_ — why the code does NOT take the more
obvious form a reader would expect. A narrow fifth case, contract
documentation, is covered below.

Comments rot: code is checked by the compiler and tests, comments aren't. A
"why not" comment only earns its place when skipping it risks a future
reader reverting the code, undetected by anything else in this project.

## Rules

### The test

Before writing (or keeping) a comment, ask: if this code's non-obvious shape
were reverted to the naive form, would `pnpm lint`, `pnpm typecheck`, or a
legible test failure catch it?

- **Yes** — don't write it; trust the tooling. (Example: resetting state
  during render instead of inside a `useEffect` body, to satisfy
  `eslint-plugin-react-compiler`'s rule against synchronous `setState` in an
  effect — reverting it fails `pnpm lint` on its own.)
- **No** — justified, limited to the three forms below, plus the separate
  contract-documentation case.

### Never write

- A comment that restates what the code already says — that's _how_.
- Design rationale ("why I chose this", "why this mirrors X elsewhere") —
  that's _why_, even when phrased as a defensive "why not" for something
  tooling would catch on revert (see "The test"). Put it in the commit
  message or a design doc instead; if one already exists for the change but
  doesn't capture this micro-decision, add it there rather than to a
  comment.
- Multi-line/multi-paragraph rationale blocks.

### Write only when the test above says "no"

- **External-system surprise** — a test-environment limitation (e.g. jsdom
  gaps), a library's unexpected behavior, a real bug workaround. State the
  fact, not the design choice built on it.
- **REQ/design-doc pointer** — cite the identifier only (`REQ-034`, `0039`),
  don't restate the reasoning; nothing in lint/typecheck verifies code
  against a requirement, so this always needs a marker. Already widespread
  here, e.g. `TableNode.tsx`'s `(REQ-020: sole PRIMARY KEY or UNIQUE
column)`.
- **Genuinely non-obvious, no design doc** — for a small change [Design
  Docs](design-docs.md) doesn't require a doc for, a short comment is fine.

### Contract documentation

**Rule:** an exported type/interface member may get a short comment stating
its contract — not the reasoning behind it — only when no single
implementation anywhere (producer or consumer, this file or another) reveals
the meaning, and a REQ/doc pointer or a better name won't work instead. Main
real-world shape: a strategy/dialect-pattern interface member with multiple
interchangeable implementations, where reading any one tells you only what
that implementation does, not the general contract every implementation must
satisfy.

**Example:**

```ts
type GenerateDdlConfig = {
  /** The table-level PRIMARY KEY constraint line(s), or `[]` if the dialect declares it inline on the column instead (or there is none). */
  generatePrimaryKeyConstraint(table: Table): string[];
};
```

`generateDdl.ts` declares this hook but never implements it — SQLite and
PostgreSQL each supply their own version, so no single implementation here
defines what every dialect must satisfy.

**Not this:** a callback prop like `onClose: () => void` is also
"implemented elsewhere," but it's just whatever the caller does — no
contract to reconcile, so it needs no comment. Before writing one of these,
check that a `Record`/config-shaped type's meaning isn't already readable
from whatever builds or reads its values nearby — that resolves most
candidates without needing this category.

### When in doubt

Ambiguity cases: whether "the test" would really catch a revert, external
surprise vs. design choice, non-obvious-enough for the third bullet, or
contract documentation vs. a REQ/doc pointer or a better name.

- **Writing a new comment**: if ambiguous, don't write it.
- **Reviewing an existing comment**: don't delete on suspicion alone — trace
  into what actually produces, consumes, or tests the code and confirm it's
  redundant or stale before removing it. A wrong guess to delete loses real
  information; a wrong guess to keep costs a few extra words.

This project's bar is strict either way — a comment earns its place by being
undetectable-without, not by being merely helpful.

## Example

```ts
// jsdom does not implement the Clipboard API.
function mockClipboard() { ... }

/** Sibling table names to validate against (REQ-018); caller excludes the table being renamed. */
existingNames: string[];

// Mermaid's attribute comment grammar has no escape for a literal `"`, so
// replace it — otherwise a column comment containing one breaks parsing.
column.comment.replaceAll('"', "'");
```

(See "Contract documentation" above for that category's own example.)

None of these need a design doc pointer or an external-surprise excuse to be
removed — tooling already catches a revert, or the comment is design
rationale that belongs in a commit message instead:

```ts
// `mermaid` is dynamically imported on first use so its bundle stays out of
// the app's initial load.
export function useMermaidPreview(code: string): MermaidPreviewState { ... }

// Reset to "loading" during render (rather than via a setState call at the
// top of the effect below), so the effect itself only ever calls setState
// from its async callback.
if (code !== renderedFor) { ... }
```

The second is a real trap: it looks like a defensive "why not" comment, but
reverting it to a `setState` at the top of a `useEffect` fails `pnpm lint`
(`eslint-plugin-react-compiler`'s `EffectSetState` rule) on its own — the
tooling is already the guardrail.
