# ownsqldesigner Requirements

A living document describing what the app does. Keep it up to date as features are added or dropped. How each feature is built (and why) belongs in design docs under `docs/design/` — see the [Design Docs rule](rules/design-docs.md).

## Overview

ownsqldesigner is a SPA for designing database schemas (E-R diagrams) visually in the browser and exporting them as SQL (DDL). It requires no server: editing, persistence, and export all happen entirely in the browser.

## Features

Each requirement has a stable identifier (`REQ-NNN`) so that design docs, tests, and commits can reference it unambiguously:

- IDs are assigned sequentially (current maximum plus one) and are flat — no category is encoded in the number, since categories may be reorganized.
- Once assigned, an ID is never reused or renumbered, even if the requirement is dropped.
- When a design doc covers a requirement, link to it from the Requirement cell.

The Phase column gives a rough implementation order: Phase 1 = core MVP, Phase 2 = richer editing experience, Phase 3 = supporting features.

### Diagram editing (canvas)

| ID      | Requirement                                                                                                                                                                                                | Phase |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| REQ-001 | Place, drag, and delete table nodes on the canvas ([0004](design/0004-table-creation-and-placement.md), [0005](design/0005-table-drag-and-position-persistence.md), [0008](design/0008-table-deletion.md)) | 1     |
| REQ-002 | Pannable canvas ([0001](design/0001-main-screen.md))                                                                                                                                                       | 1     |
| REQ-003 | Canvas zoom (in/out) ([0020](design/0020-canvas-zoom.md))                                                                                                                                                  | 2     |
| REQ-004 | Multi-select (Shift+click / rubber-band) with group move ([0015](design/0015-multi-select-and-group-move.md))                                                                                              | 2     |
| REQ-005 | Undo / redo ([0016](design/0016-undo-redo.md))                                                                                                                                                             | 2     |
| REQ-006 | Snap to grid ([0022](design/0022-snap-to-grid.md))                                                                                                                                                         | 3     |
| REQ-007 | Minimap (overview with draggable viewport) ([0023](design/0023-minimap.md))                                                                                                                                | 3     |
| REQ-008 | Auto-align tables                                                                                                                                                                                          | 3     |

### Table / column definition

| ID      | Requirement                                                                                                                                                        | Phase |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| REQ-009 | Create, rename, and comment tables ([0004](design/0004-table-creation-and-placement.md))                                                                           | 1     |
| REQ-010 | Add, edit, remove, and reorder columns (name / type / size / default value / nullable / auto-increment / comment) ([0006](design/0006-table-column-management.md)) | 1     |
| REQ-011 | Column type selection from a per-dialect datatype set (SQLite initially) ([0006](design/0006-table-column-management.md))                                          | 1     |
| REQ-012 | Toggle display of column type / size on the canvas ([0021](design/0021-column-type-size-toggle.md))                                                                | 3     |

### Keys and relations

| ID      | Requirement                                                                                                                                         | Phase |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| REQ-013 | Define PRIMARY KEY / UNIQUE / INDEX keys, including composite keys ([0007](design/0007-table-key-management.md))                                    | 1     |
| REQ-014 | Create and remove foreign-key relations by connecting existing columns ([0009](design/0009-foreign-key-relations.md))                               | 1     |
| REQ-015 | Render relation connectors (curved, auto-routed) with highlight on selection ([0009](design/0009-foreign-key-relations.md))                         | 1     |
| REQ-016 | Auto-generate a child column when creating a foreign key (configurable naming pattern) ([0012](design/0012-foreign-key-child-column-generation.md)) | 2     |
| REQ-017 | Propagate parent column type changes to connected child columns ([0013](design/0013-foreign-key-type-propagation.md))                               | 2     |

### Integrity and validation

| ID      | Requirement                                                                                                                                                                              | Phase |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| REQ-018 | Table names are unique within the schema; column names are unique within their table ([0010](design/0010-name-validation-and-sql-export.md))                                             | 1     |
| REQ-019 | Table and column names are non-empty and can be output as valid SQL identifiers (exact naming rules are settled in a design doc) ([0010](design/0010-name-validation-and-sql-export.md)) | 1     |
| REQ-020 | A foreign key may only reference a PRIMARY KEY or UNIQUE column ([0009](design/0009-foreign-key-relations.md))                                                                           | 1     |
| REQ-021 | Deleting a table or column never leaves dangling relations or key members ([0009](design/0009-foreign-key-relations.md))                                                                 | 1     |
| REQ-022 | A table has at most one PRIMARY KEY; a key has at least one column ([0007](design/0007-table-key-management.md))                                                                         | 1     |
| REQ-023 | When an edit violates an integrity rule, the UI shows why it was rejected ([0001](design/0001-main-screen.md), [0010](design/0010-name-validation-and-sql-export.md))                    | 1     |
| REQ-033 | Auto-increment is allowed only where the dialect permits it (SQLite: a single INTEGER PRIMARY KEY column) ([0007](design/0007-table-key-management.md))                                  | 1     |
| REQ-034 | Validation warnings (e.g. a table without a primary key) are visible before SQL export ([0010](design/0010-name-validation-and-sql-export.md))                                           | 2     |

### Input / output and persistence (browser-only)

| ID      | Requirement                                                                                                                                                           | Phase |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| REQ-024 | Save and load the entire schema losslessly (diagram layout included) ([0002](design/0002-schema-persistence-and-creation.md))                                         | 1     |
| REQ-025 | Save, list, and load named schemas in browser storage ([0002](design/0002-schema-persistence-and-creation.md), [0003](design/0003-schema-selection-rename-delete.md)) | 1     |
| REQ-026 | Export SQL (DDL): CREATE TABLE with keys and foreign-key constraints (SQLite dialect) ([0010](design/0010-name-validation-and-sql-export.md))                         | 1     |
| REQ-027 | Download the schema as a file / load from a local file ([0014](design/0014-schema-file-download-and-load.md))                                                         | 2     |
| REQ-028 | Warn before leaving the page with unsaved changes ([0002](design/0002-schema-persistence-and-creation.md))                                                            | 2     |
| REQ-035 | Create a new blank schema ([0002](design/0002-schema-persistence-and-creation.md))                                                                                    | 1     |
| REQ-036 | Delete saved schemas from browser storage ([0003](design/0003-schema-selection-rename-delete.md))                                                                     | 1     |
| REQ-037 | Rename saved schemas in browser storage ([0003](design/0003-schema-selection-rename-delete.md))                                                                       | 2     |

### UI / UX

| ID      | Requirement                                                                                             | Phase |
| ------- | ------------------------------------------------------------------------------------------------------- | ----- |
| REQ-029 | Dark mode (theme switching) ([0018](design/0018-dark-mode-toggle.md))                                   | 2     |
| REQ-030 | Japanese / English UI switching (i18n) ([0019](design/0019-i18n-locale-switching.md))                   | 2     |
| REQ-031 | Keyboard shortcuts (delete, undo/redo, confirm/cancel, ...) ([0017](design/0017-keyboard-shortcuts.md)) | 2     |
| REQ-032 | Persist settings (dialect, snap, FK naming pattern, display toggles)                                    | 3     |

## Non-Goals

- Server-side backend (persistence API, authentication)
- Importing schemas from an existing live database (reverse engineering)
- External storage integrations (Dropbox, etc.)
- Dialects other than SQLite (may be supported in the future, but out of scope for now)
- Touch / mobile support (may be considered in the future, but out of scope for now)
- Real-time collaboration
- Print-specific styling

## Constraints

- Runs entirely in the browser (SPA, no backend); persistence is limited to browser storage and file input/output
- React 19 + TypeScript + Vite, managed with pnpm (follows the existing stack)
- Adding a new SQL dialect (datatypes and SQL generation) must be possible without rewriting core features
