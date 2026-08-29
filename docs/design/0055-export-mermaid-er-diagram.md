# Export Mermaid ER Diagram

- **Status**: Implemented
- **Created**: 2026-08-29
- **Updated**: 2026-08-29

## Context

The toolbar already offers "Export SQL" (DDL text, copy/download) and
"Download JSON" (the raw schema file), but there is no way to get the current
schema as a Mermaid `erDiagram` — useful for pasting into docs/wikis that
render Mermaid, or for a quick visual sanity check outside the app's own
canvas. The user asked for this as a new export feature with copy-to-clipboard
or file download, plus an in-app live preview of the rendered diagram.

## Goals / Non-Goals

**Goals**

- Generate Mermaid `erDiagram` source from the current schema's tables
  (REQ-041).
- Let the user copy the generated code to the clipboard or download it as a
  `.mmd` file.
- Render a live SVG preview of the diagram inside the app, switchable via a
  Code/Preview tab in the same dialog.
- Mark each foreign key as a one-to-many or one-to-one relationship in the
  generated diagram, inferred from the existing schema model rather than
  stored as new state.

**Non-Goals**

- Many-to-many relationship detection (junction-table inference). The schema
  model has no explicit M:N concept, and inferring one from FK shape alone is
  out of scope.
- Importing/editing Mermaid code back into the schema — export only.
- Any Mermaid diagram type other than `erDiagram`.
- Interactive preview manipulation (zoom/pan) — the preview is a static
  rendered image.

## Design

### Code generation

`generateMermaidErDiagram(tables: Table[]): string`
(`src/domain/schema/generateMermaidErDiagram.ts`) mirrors the shape of the
existing DDL generator (`src/domain/dialect/generateDdl.ts`) but is
dialect-independent, so it lives directly under `domain/schema/` instead of
`domain/dialect/`. It emits one `erDiagram` entity block per table followed by
one relationship line per foreign key.

Table and column names never need escaping: REQ-019 already restricts them to
`^[A-Za-z_][A-Za-z0-9_]*$`, which is also a valid Mermaid identifier.

Two encoding details were verified directly against the installed `mermaid`
package's parser (not just the docs), because its attribute grammar is
stricter than it first looks:

- A column's `type` (e.g. PostgreSQL's `DOUBLE PRECISION`) has its spaces
  replaced with `_`, since Mermaid attribute types are whitespace-delimited
  tokens.
- Key markers (`PK`/`UK`/`FK`) are joined with a bare comma and **no
  surrounding quotes** (`PK,FK`) — quoting them causes Mermaid to parse the
  whole thing as the attribute's comment instead of its key list. Extra
  column detail (size, precision, "not null", the column's own comment) is
  instead packed into a separate quoted comment segment, with any `"` in a
  free-text column comment replaced by `'` (Mermaid's comment grammar has no
  escape sequence for it).

Cardinality is derived, not stored: a foreign key's child-side column is
checked with the existing `isReferenceableColumn` (`domain/schema/key.ts`) —
the same helper that already enforces "an FK target must be the sole column of
a PK/UNIQUE key" — against the **child** table this time. If the FK column is
itself uniquely constrained, the relationship is one-to-one (`||--||`);
otherwise one-to-many (`||--o{`).

### Live preview

The `mermaid` npm package (added as a new dependency) is dynamically imported
(`await import("mermaid")`) only when the preview tab is mounted, so its large
bundle is never part of the app's initial load — confirmed via `pnpm build`,
which showed the main bundle grow by only ~3 KB gzipped while `mermaid`'s own
code landed in separate on-demand chunks.

`mermaid.render(id, code)` returns an SVG string without touching the DOM
itself. That string is wrapped in a `Blob` and turned into an object URL
(`URL.createObjectURL`), then handed to a plain `<img>` — not injected via
`dangerouslySetInnerHTML`. This was a deliberate choice over the simpler
"inject the SVG markup directly" approach: an `<img>` treats the SVG as an
opaque image, so there is no path from generated diagram text to live DOM
injection, even though in practice the source text is already constrained to
safe identifier characters. The object URL is revoked (`URL.revokeObjectURL`)
whenever the code changes or the preview unmounts.

This async lifecycle (dynamic import, render, object URL, cleanup) is
extracted into `useMermaidPreview` (`src/pages/MainScreen/hooks/`) per the
Component Design rule's guidance to extract async/lifecycle-dependent logic
into a Hook. The hook resets to `"loading"` by comparing `code` against the
previous render during the component's render phase (not via a `setState`
call at the top of the effect), which avoids an
`EffectSetState`/cascading-render lint warning from the React Compiler
plugin (`eslint-plugin-react-compiler`) while keeping the actual async work in
the effect.

### UI

`ExportMermaidDialog` (`src/pages/MainScreen/components/ExportMermaidDialog/`)
follows `ExportSqlDialog`'s existing shape: a single component (no
Container/Presentation split — the only state is local UI state) wrapping the
shared `Dialog` primitive, mounted only while open. It adds a `role="tablist"`
Code/Preview toggle (the same small pattern already used by
`DefaultColumnTemplatesEditor`'s dialect tabs) above the content area:

- **Code tab**: the same read-only `<textarea>` + download
  (`file-saver`'s `saveAs`, `.mmd` extension) + copy-to-clipboard
  (`navigator.clipboard.writeText`) buttons as `ExportSqlDialog`.
- **Preview tab**: `useMermaidPreview`'s SVG-as-`<img>`, with loading/error
  states.

Wiring follows the existing `exportSql` pattern exactly: a new `"exportMermaid"`
member on `ActiveDialogContext`'s `DialogKind`, a `mermaidCode` value computed
in `DialogHost` only while that dialog is the active one (mirroring the
existing `ddl` computation), and a new toolbar button.

### Testing

`mermaid.render()` depends on browser layout/measurement APIs (`getBBox`,
`CSSStyleSheet`, ...) that jsdom does not implement — confirmed directly by
running the real package under jsdom during design, which failed with
`CSSStyleSheet is not defined`. Component and hook tests therefore mock the
`mermaid` module entirely (asserting that `render` was called and that its
returned SVG string reaches the `<img>` as an object URL) rather than
exercising real rendering; correctness of the generated Mermaid _syntax_
itself is covered by `generateMermaidErDiagram.test.ts`'s assertions, which
were validated against the real Mermaid parser during design.

## Alternatives Considered

- **`dangerouslySetInnerHTML` for the preview** — rejected during review: even
  though the generated SVG only ever contains identifier-safe text, rendering
  it as an `<img>` via an object URL removes the DOM-injection path entirely
  instead of relying on that guarantee holding forever.
- **No live preview, code-only export** — rejected: the user explicitly asked
  for an in-app preview, not just a copyable/downloadable code block.
- **Storing explicit relationship cardinality on the schema model** —
  rejected: no other feature needs it, and it's fully derivable from the
  existing FK/key data via `isReferenceableColumn`.
