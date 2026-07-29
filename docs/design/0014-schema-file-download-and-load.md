# Schema File Download and Load

- **Status**: Implemented
- **Created**: 2026-07-29
- **Updated**: 2026-07-29

## Context

[0010](0010-name-validation-and-sql-export.md) implemented REQ-026 (SQL DDL
export) and explicitly deferred REQ-027 — downloading and loading the schema
JSON itself, not the exported DDL — as its own future doc.
[0001](0001-main-screen.md) already settled where it lives in the UI: "next
to Export SQL" in the toolbar. This doc covers the rest: the file format, the
validation a loaded file goes through, and how loading replaces the current
schema.

Two things did not exist anywhere in the codebase before this change: any
file-upload code (`FileReader`, `<input type="file">`), and any function that
re-checks a whole `Schema`'s invariants in bulk. Every domain mutator in
`schema.ts` (REQ-018/019/020/021/022) enforces its own invariant one edit at a
time — table/column name uniqueness, valid identifiers, FK targets, no
dangling references, at most one PRIMARY KEY per table — but nothing
re-verifies all of them at once. That gap matters here specifically: a file
loaded from disk can be hand-edited, so it can be structurally valid (the
right shapes and types) while violating an invariant that no in-app edit
could ever produce.

## Goals / Non-Goals

**Goals**

- Download the current schema as a `.json` file.
- Load a schema from a local `.json` file, replacing the current schema, with
  a confirmation step and clear feedback on failure.
- Reject a file that is well-shaped but violates a domain invariant, rather
  than silently accepting a schema no in-app edit could have produced.

**Non-Goals**

- Merging a loaded file into the current schema — only whole-document
  replacement is supported.
- Any file-format version beyond what `schemaSchema` itself expresses; there
  is exactly one consumer of this file format today.
- Drag-and-drop loading, or loading more than one file at a time.

## Design

**File format.** The downloaded file is a bare, pretty-printed `Schema` JSON
document — not the `{ version, schema }` envelope
`localStorageSchemaRepository` uses internally. That envelope exists to
version an _internal storage format_ independently of the domain document
(see 0002); a user-facing file is a different, simpler concern, and
`schemaSchema` can already grow through zod without a second versioning axis.
Introducing a file-specific envelope now would just be a wrapper with no
consumer.

**Download.** A single toolbar button downloads immediately via `file-saver`
— no dialog. Unlike Export SQL, which previews DDL and surfaces a
primary-key warning before the user commits to downloading, there is no
preview content here: the file is exactly the in-memory schema already on
screen. The `Blob`/filename construction lives in a small hook,
`useDownloadSchemaFile`, rather than in `Toolbar` itself: the hook reads
`useCurrentSchema()` and returns `{ canDownload, downloadSchemaFile }`, and
`Toolbar`'s button is a thin pass-through (`onClick={onDownloadSchema}`,
`disabled={!canDownloadSchema}`) with no knowledge of `Schema`, `file-saver`,
or filename sanitization. This keeps the save logic unit-testable against the
hook directly, and keeps `Toolbar`'s own test limited to "the button fires
the handler it was given."

**Load: parse and validate.** A new domain function, `parseSchemaFile(raw:
string): Schema | null`, is the single entry point a loaded file goes
through: `JSON.parse` (catching a parse failure), then `schemaSchema.safeParse`
for shape/type validation, then the new `isSchemaIntegrityValid(schema):
boolean` for the invariants no per-field zod check can express (duplicate
names, dangling key/FK references, a non-PK/UNIQUE FK target, more than one
PRIMARY KEY). This mirrors `parseStoredSchema`'s existing "parse untrusted
text, return `Schema | null`" contract, so the UI layer never touches zod or
the integrity check directly — it only sees a `Schema` or `null`.

**Load: identity and confirmation.** A successfully-parsed file is not
applied to the workspace with its own `id`/timestamps intact. A new domain
function, `importSchema(schema, options)`, assigns a fresh `id` and refreshes
`createdAt`/`updatedAt`. Reusing the file's own `id` would risk silently
colliding with — and overwriting — an unrelated saved schema at the same
storage key, which is a realistic hazard for an "export, edit externally,
re-import" workflow. There is no uniqueness constraint on schema `name`
today (`id` is the sole identity per 0002), so a duplicate name on import is
fine, exactly as it already is for a manually created schema.

Once a file parses and validates successfully, a confirmation dialog appears
("Replace the current schema with ... ? This cannot be undone.") before the
swap happens — replacing the whole workspace is exactly the kind of
irreversible action every other destructive action in this app already gates
behind a confirm dialog. Parsing happens _before_ the confirmation, not
after: prompting to replace the schema before knowing the file is even
loadable would be a wasted, misleading confirmation.

This flow — `LoadSchemaButton`, a component newly nested inside `Toolbar` —
is self-contained rather than routed through `DialogHost`/`ActiveDialogContext`.
It owns its own `pendingSchema` state and renders its own `ConfirmDialog`,
pulling `useSchemaActions()`/`useNotification()` directly from context. This
mirrors how `SchemaMenu` (also nested inside `Toolbar`) already pulls
`useActiveDialog()` itself rather than have `Toolbar` forward it. Routing
this through the shared dialog machinery would have needed either a
payload-carrying `openDialog`, which no other dialog needs, or new
prop-drilling of the pending schema through `MainScreenView`/`DialogHost` —
both worse than a small self-contained component.

**Failure feedback.** Any failure — unparsable text, wrong shape, or a
failed integrity check — surfaces through the existing `NotificationContext`,
the same mechanism `selectSchema` already uses when a saved schema fails to
load. No new error-display mechanism was needed.

## Alternatives Considered

- **The `{version, schema}` storage envelope for the downloaded file** —
  rejected: over-engineered for a format with a single consumer; versioning
  already lives at the right layer (`schemaSchema` itself).
- **Preserving the file's own `id`/timestamps on import** — rejected: risks
  silently overwriting an unrelated saved schema at the same storage key.
- **A full preview dialog for download**, mirroring Export SQL — rejected:
  there is no preview content to justify one; the file is exactly what's
  already on screen.
- **Routing load through `DialogHost`/a new `DialogKind`** — rejected in
  favor of a self-contained component; both alternatives (a payload-carrying
  `openDialog`, or threading the pending schema through `MainScreenView`)
  were worse than mirroring `SchemaMenu`'s existing "pull my own context"
  precedent.
- **Skipping integrity re-validation and trusting `schemaSchema` alone** —
  rejected: a hand-edited file can pass structural validation while
  violating an invariant no in-app edit could ever produce.
- **Drag-and-drop loading** — rejected as unnecessary scope for now; a
  click-to-pick file input covers the requirement.

## Open Questions

- A future "merge into the current schema" import mode, instead of only
  whole-document replacement.
- Whether a size guard on `JSON.parse` is ever warranted — consistent with
  0002's existing assumption that a schema document is tens of kilobytes at
  worst, this is not a concern today.
