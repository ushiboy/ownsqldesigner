# Design Docs

## When

Before starting work on a new feature, a large change, or anything that affects the architecture (data model, state management, routing structure, ...). Small bug fixes and refactorings do NOT need a design doc.

## What

Design docs live in `docs/design/`, one file per feature or change, named `NNNN-<kebab-case-slug>.md` (4-digit sequence number, e.g. `0001-table-editor.md`). The next number is the current maximum in the directory plus one.

A design doc records _how_ something is built and _why_ that design was chosen. [Requirements](../requirements.md) records _what_ the app does — when a design doc covers a feature, link to it from the Features list there.

Each doc starts with a metadata block and tracks its lifecycle through a status:

| Status        | Meaning                                                        |
| ------------- | -------------------------------------------------------------- |
| `Draft`       | Being written or discussed; not yet the agreed design          |
| `Accepted`    | Agreed design; implementation may start                        |
| `Implemented` | The design has been built and shipped                          |
| `Superseded`  | Replaced by a newer doc; MUST link to the doc that replaces it |

## Rules

### Placement and naming

- Design docs MUST be placed in `docs/design/` and named `NNNN-<kebab-case-slug>.md`.
- Never reuse or renumber an existing sequence number.

### Metadata

- Every doc MUST begin with a metadata list right after the title: **Status**, **Created**, **Updated** (dates in `YYYY-MM-DD`).
- **Status** MUST be one of `Draft`, `Accepted`, `Implemented`, `Superseded`.
- A `Superseded` doc MUST link to its successor in the metadata block.

### Draft approval

- Writing a `Draft` is not approval to implement it. Do not start writing code against a `Draft` — get it to `Accepted` (explicit user sign-off) first.
- This matters most when the `Draft` introduces a new external dependency or another hard-to-reverse choice (a data model shape, a state-management approach, ...): undoing that class of decision after implementation costs far more than pausing for approval would have. When in doubt about whether a choice is significant enough to need explicit sign-off, ask rather than assume silence means agreement.

### Sections

- Required sections, in order:
  1. `## Context` — the background and the problem being solved
  2. `## Goals / Non-Goals` — what this design does and deliberately does not cover
  3. `## Design` — the chosen design; add subsections (data model, UI, flow, ...) as needed
  4. `## Alternatives Considered` — alternatives that were evaluated and why they were rejected
- Optional sections after those: `## Open Questions`, `## References`.

### Maintenance

- Write the reasoning behind the design, not a copy of the implementation. Never duplicate details that the code itself expresses (exact signatures, full component trees, ...).
- When a feature described by a doc is implemented, update the doc's Status (and its content, if the design drifted during implementation) in the same change.
- If testing or driving the feature turns up a follow-up fix or refinement to the same doc's Goals/Non-Goals while it's still the same round of work (not yet implemented-and-moved-on-from), fold it into the current doc instead of starting a new sequentially-numbered one — update its Context to say what was found and why, and its Design/Non-Goals to match. Only split into a new doc (see below) once the original has genuinely shipped and a later, separate piece of work revisits it.
- When the design changes significantly later, write a new doc and mark the old one `Superseded` instead of rewriting history.
- When a doc covers a feature, add a link to it from the Features list in `docs/requirements.md`.

## Example

`docs/design/0001-table-node-canvas.md` — this also serves as the template for new docs:

```markdown
# Table Node Canvas

- **Status**: Accepted
- **Created**: 2026-07-16
- **Updated**: 2026-07-16

## Context

Users need to lay out table definitions visually. There is currently no
canvas surface; tables can only be listed as text.

## Goals / Non-Goals

**Goals**

- Render each table as a draggable node on a pannable canvas.
- Persist node positions in the diagram model.

**Non-Goals**

- Relation (foreign key) edges between nodes — covered by a later doc.
- Zooming.

## Design

Each table is rendered as an absolutely positioned node inside a canvas
component that owns pan state. Positions are stored per table in the
diagram model, not in component state, so they survive reloads.

### Data model

`TableNode` gains a `position: { x: number; y: number }` field, updated
on drag end only (not per mouse move) to keep undo history small.

## Alternatives Considered

- **SVG-based canvas** — rejected: HTML nodes make text editing inside
  a table far simpler than `foreignObject`.
- **Persisting position on every mouse move** — rejected: floods undo
  history and re-renders the whole canvas while dragging.

## Open Questions

- Should node positions be included in the exported SQL file's header
  comment for round-tripping?
```
