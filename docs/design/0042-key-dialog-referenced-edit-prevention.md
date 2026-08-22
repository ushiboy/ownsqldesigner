# KeyDialog: Prevent Edits That Would Break FK Referenceability

- **Status**: Implemented
- **Created**: 2026-08-22
- **Updated**: 2026-08-22

## Context

[0030](0030-prevent-dangling-foreign-key-on-key-removal.md) added a
domain-level guard (`canUpdateKey`) so that editing a key referenced by
another table's foreign key can never make it stop being a valid FK target
(REQ-020's invariant: a foreign key may only reference a sole
PRIMARY KEY/UNIQUE column). That guard is a silent no-op: `updateKey`
simply returns the schema unchanged when the edit would break
referenceability, with no feedback surfaced to the user. 0030 explicitly
deferred fixing the UI side of this (Non-Goals): "`KeyDialog`'s edit form
does not get prospective UI prevention... Left as a candidate follow-up if
it proves confusing in practice."

Concretely: a user editing a referenced `UNIQUE` key who retypes it to
`INDEX`, or checks a second column, sees the dialog close and Save appear to
succeed — the key then silently reverts to its prior value. This is the one
remaining integrity rule in the app not covered by REQ-023 ("When an edit
violates an integrity rule, the UI shows why it was rejected"); every other
rule in `KeyDialog`/`ColumnDialog` already uses a disabled-control-plus-hint
pattern instead of a silent domain no-op.

## Goals / Non-Goals

**Goals**

- `KeyDialog`'s edit form shows an explanatory hint and disables Save when
  the current `type`/column selection would break a referenced key's
  referenceability, live-updating as the user edits either field.
- Reuse 0030's existing predicate logic (`canUpdateKey`'s
  `keepsColumnReferenceable` check) as the single source of truth, so the
  UI-level check and the domain-level safety net can never drift apart.
- Toggling a referenced key between `PRIMARY_KEY` and `UNIQUE` on the same
  single column stays allowed (both remain valid FK targets), matching
  `canUpdateKey`'s existing behavior.

**Non-Goals**

- No change to `canUpdateKey`'s domain-level behavior — it stays as
  defense-in-depth, per 0007/0009/0030's established "UI prevention as the
  primary mechanism, a domain no-op as a safety net" split.
- The Add-key dialog needs no change: a brand-new key can never already be
  referenced by a foreign key.
- No change to the cascading delete-key flow (0030's `deleteKey` confirm
  dialog) — this doc only concerns the edit form.

## Design

### Domain layer (`src/domain/schema/key.ts`)

The private `keepsColumnReferenceable(existingKey, fields)` helper — already
exactly the "would this edit keep the key referenceable" predicate — is
exported (and re-exported from `src/domain/schema/index.ts`) with no
behavior change. `canUpdateKey` keeps calling it exactly as before.

### `KeyDialog`

Gains a new required prop, `isReferencedByForeignKey: boolean`. Inside the
form, on every render (the same plain-derived-boolean pattern
`ColumnDialog` uses for its 0039 size/precision format hints — no
`useEffect`):

```ts
const wouldBreakReference =
  isReferencedByForeignKey &&
  initialKey !== null &&
  !keepsColumnReferenceable(initialKey, { type, columnIds });
```

A hint (`keyDialog.referencedKeyEditBlockedHint`) renders below the
column-checkbox list when `wouldBreakReference` is true, and the submit
button's `disabled` condition gains `|| wouldBreakReference`.

### `DialogHost`

Already computes `isSelectedKeyReferenced` (added by 0030, used today only
to branch the delete-key confirm message). This is threaded straight into
the edit-key `<KeyDialog>` render site as `isReferencedByForeignKey`; the
add-key render site passes `false`.

## Alternatives Considered

- **Compute the check inside `KeyDialog` from a `tables: Table[]` prop**
  (calling `isKeyReferencedByForeignKey` itself) — rejected: the
  "is this key currently referenced" fact doesn't change as the user edits
  the form, only "would the _new_ fields stay valid" does, and the latter
  needs only `initialKey` + live `fields`, not the whole table list. Passing
  a single precomputed boolean keeps `KeyDialog` free of a new `tables`
  dependency and matches how `primaryKeyDisabled` is already threaded in as
  a precomputed prop rather than raw table data.
- **A `KeyEditDisabledReason`-style reason enum**, mirroring
  `KeyMembershipDisabledReason` — rejected as overkill for now: there is
  only one possible reason today, unlike `ColumnDialog`'s key-membership
  checkboxes which conflate multiple causes per checkbox. Revisit if a
  second distinct reason is ever added.

## References

- [0030 — Prevent Dangling Foreign Key on Key Removal](0030-prevent-dangling-foreign-key-on-key-removal.md)
- [0039 — Column Size/Precision Format Validation](0039-column-size-precision-format-validation.md) (the block-Save-with-a-hint UX precedent)
