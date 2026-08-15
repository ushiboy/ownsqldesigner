# Column Size/Precision Format Validation

- **Status**: Implemented
- **Created**: 2026-08-15
- **Updated**: 2026-08-15

## Context

`Column.size` and `Column.precision` (`src/domain/schema/types.ts`) are free
text, deliberately unvalidated by the zod schema — the schema's comments say
dialect validity is `DialectStrategy`'s job. Today, `DialectStrategy` only
enforces _type eligibility_ for these fields (`sizableColumnTypes`/
`precisionColumnTypes` in `src/domain/dialect/dialectStrategy.ts`, consumed
by `ColumnDialog.tsx` to disable the field and by
`normalizeColumnForDialect` to clear it when a column's type changes away
from an eligible one). Nothing validates the _content_ of the value once the
field is eligible.

This is a real gap: `src/domain/postgresql/generateDdl.ts` emits
`${type}(${modifier})` verbatim from `column.size`/`column.precision`. A
user can type `"abc"` into a `VARCHAR` column's Size, or `"99"` into a
`TIMESTAMP` column's Precision, and it round-trips unnoticed into broken DDL
(`VARCHAR(abc)`, `TIMESTAMP(99)`) — a gap against REQ-023 ("When an edit
violates an integrity rule, the UI shows why it was rejected").

This was flagged as deferred twice already:

- [0034](0034-postgresql-dialect-strategy.md)'s Open Questions
  ("Type-conditional `size` validation").
- [0037](0037-time-timestamp-precision.md)'s Non-Goals/Open Questions,
  which says explicitly any fix "would need a validation-tier decision
  shared with `size`, not a precision-only fix" — i.e. this doc must cover
  both fields together, not just `precision`.

Because this adds new surface to the `DialectStrategy` interface — a
data-model-adjacent, hard-to-reverse choice — this doc requires explicit
`Accepted` sign-off before implementation, per
[the Design Docs rule](../rules/design-docs.md).

## Goals / Non-Goals

**Goals**

- PostgreSQL `precision` on `TIME`/`TIMESTAMP` must be an integer in
  `[0, 6]` (PostgreSQL's valid range for fractional-seconds precision).
- PostgreSQL `size` on `VARCHAR`/`CHAR` must be a single positive integer.
- PostgreSQL `size` on `NUMERIC` must be a single positive integer, or a
  comma-separated pair of positive integers where the second (scale) may be
  zero (e.g. `"10"` or `"10,2"` or `"10,0"`) — `NUMERIC(precision[, scale])`
  reuses the same `size` field, so its format is inherently
  per-column-type, not a single dialect-wide shape.
- The empty string is always valid, regardless of type — the field stays
  optional even when the type supports it (e.g. a bare `VARCHAR` with no
  length is legal DDL).
- SQLite opts out entirely: it keeps today's unvalidated looseness,
  matching its existing `sizableColumnTypes` (all 5 SQLite column types,
  reflecting SQLite's loose type-affinity grammar) and `precisionColumnTypes`
  (empty).
- Invalid values are caught live in `ColumnDialog`: a hint appears and Save
  is disabled, mirroring the existing Name-field validation pattern
  (`describeNameValidity`).

**Non-Goals**

- Changing `normalizeColumnForDialect`'s existing silent-clamp behavior.
  That function handles _type-eligibility_ mismatches the user didn't
  directly cause (e.g. changing a column's type away from `VARCHAR`
  invalidates a previously-typed `size`) — a different problem from a user
  typing a malformed value into a field they're actively editing. See
  Design's UX rationale below for why the two need different UX.
- Validating `defaultValue` or any other `Column` field.
- Enforcing PostgreSQL's actual magnitude limits on `VARCHAR`/`NUMERIC`
  size (e.g. `NUMERIC` precision ≤ 1000) — only the shapes stated above.
  Can be a follow-up if it ever matters in practice. This also covers the
  cross-field relationship between `NUMERIC`'s two components: `isSizeValid`
  checks precision and scale independently, so e.g. `NUMERIC(5,10)` passes
  even though scale exceeding precision is rejected by PostgreSQL versions
  before 15. Named explicitly here (not just implied by the ceiling
  example above) so it reads as a deliberate scope cut, not an oversight.
- Any dialect beyond SQLite/PostgreSQL (none exist yet).
- Retroactively validating `size`/`precision` values already sitting in a
  saved schema or an imported file — see Open Questions.

## Design

### `DialectStrategy` surface

Add two methods to both `DialectStrategyConfig` and the derived
`DialectStrategy` (`src/domain/dialect/dialectStrategy.ts`):

```ts
isSizeValid(type: string, value: string): boolean;
isPrecisionValid(type: string, value: string): boolean;
```

`buildDialectStrategy` passes both through unchanged — the same
config-in/strategy-out pass-through already used for `isAutoIncrementEligible`,
`isNameTaken`, `isReservedKeyword`, and `hasDuplicateNames`. This keeps the
"atomic per-dialect rule in config, generic derivation in
`buildDialectStrategy`" convention intact rather than introducing a new
shape for just this case.

SQLite (`sqliteDialectStrategy.ts`) supplies `() => true` for both — an
explicit opt-out, not an omission, so a reader sees the choice was
deliberate rather than wondering if it was forgotten.

PostgreSQL's rule bodies live in a new
`src/domain/postgresql/sizeAndPrecisionValidation.ts` (mirrors the existing
`autoIncrement.ts` split), regex-based:

```ts
const POSITIVE_INT_PATTERN = /^[1-9]\d*$/;
const NUMERIC_SIZE_PATTERN = /^[1-9]\d*(,(0|[1-9]\d*))?$/;
const PRECISION_PATTERN = /^[0-6]$/;
```

`isPostgresqlSizeValid(type, value)`: `""` is always valid; `NUMERIC` uses
`NUMERIC_SIZE_PATTERN`; `VARCHAR`/`CHAR` use `POSITIVE_INT_PATTERN`; any
other type returns `true` (unreachable in practice — `ColumnDialog` only
calls this when the field is eligible).

`isPostgresqlPrecisionValid(type, value)`: `""` is always valid;
`TIME`/`TIMESTAMP` use `PRECISION_PATTERN`; any other type returns `true`.

Note the intentional asymmetry: `"0"` is _invalid_ as a `size` (must be
strictly positive — a zero-length `VARCHAR` is meaningless) but _valid_ as
a `precision` (0 fractional seconds is legal PostgreSQL syntax). Likewise
`NUMERIC`'s scale segment allows `0` (`NUMERIC(10,0)`) even though its
precision segment does not, since `NUMERIC(0, ...)` isn't valid PostgreSQL
syntax either way — only the scale position permits zero.

### UX: block + hint, not silent clamp

REQ-023 governs _user-typed_ invalid input in a field the user is actively
editing — the same category as the Name field, which already blocks Save
via `describeNameValidity` (`src/domain/schema/validation.ts`) and
`ColumnDialog.tsx`'s hint-under-input + `disabled={...}` wiring. The
existing silent-clamp precedent (`normalizeColumnForDialect`, from
[0036](0036-domain-layer-column-normalization.md)) exists for a different
problem — a structural mismatch introduced by an action elsewhere (changing
the type), not malformed content in the field itself — so its
silent-correction UX doesn't transfer here.

Reachability check for hint overlap: `ColumnDialog.tsx`'s type `<select>`
`onChange` already clears `size`/`precision` to `""` the instant the new
type makes the field ineligible, and the submit handler re-clamps as a
safety net. So whenever `sizeAllowed`/`precisionAllowed` is `false`, the
field's live value is always `""` in every reachable UI path. The new
"invalid format" hint and the existing "not applicable" hint are therefore
mutually exclusive by construction — **but only if the submit button's
`disabled` condition gates the new format checks behind the same
`sizeAllowed &&`/`precisionAllowed &&` guard**:

```tsx
disabled={
  isNameEmpty || isNameInvalidShape || isNameReserved || isNameDuplicate ||
  (sizeAllowed && !isSizeFormatValid) ||
  (precisionAllowed && !isPrecisionFormatValid)
}
```

Stating this explicitly here (rather than leaving it implied) so a future
change to either condition doesn't decouple them by accident.

### No `validation.ts` wrapper

`ColumnDialog` calls `strategy.isSizeValid(fields.type, fields.size)`
directly rather than going through a `describe*Validity`-style wrapper in
`domain/schema/validation.ts`. This is a deliberate style deviation from
the `describeNameValidity` precedent, not an oversight: `describeNameValidity`
composes several checks (`isEmpty`, shape, reserved-keyword, duplicate) into
one struct, which justifies a wrapper; `isSizeValid`/`isPrecisionValid` are
each a single pass-through call with no composition to do. `ColumnDialog`
already reads `strategy.sizableColumnTypes`/`precisionColumnTypes` directly
today, so calling the new methods the same way matches this component's
existing direct-strategy-access style.

### UI wiring

`ColumnDialog.tsx` computes `isSizeFormatValid`/`isPrecisionFormatValid`
alongside the existing `sizeAllowed`/`precisionAllowed`, renders a second
conditional hint `<p>` under each input (gated as shown above), and extends
the submit button's `disabled` condition. No change to the type `<select>`'s
`onChange` handler or the submit-time eligibility clamp — format validity is
a pure additional gate, not a value transform.

New i18n keys `columnDialog.sizeInvalidFormatHint` /
`columnDialog.precisionInvalidFormatHint` (`Messages.ts`, `en.ts`, `ja.ts`),
placed next to the existing `sizeNotApplicableHint`/`precisionNotApplicableHint`.

## Alternatives Considered

- **Declarative rule-config shape** (e.g. `{ kind: "range", min, max } |
{ kind: "pattern", regex }`) instead of predicate functions — rejected:
  still needs a discriminated union to express the `NUMERIC` comma-pair
  case, so it doesn't reduce code, and a plain function is easier to
  unit-test in isolation.
- **Folding validation into `sizableColumnTypes`/`precisionColumnTypes`**
  (e.g. changing them from `readonly string[]` to a
  `Record<string, RegExp>`) — rejected: conflates _eligibility_ (which
  types can carry the field at all) with _format_ (what a valid value
  looks like once eligible), and would break a field shape consumed
  directly in several places (`ColumnDialog.tsx`, `normalizeColumnForDialect`).
- **Silent clamp instead of blocking** — rejected per the UX rationale
  above (REQ-023, and the category difference from 0036's precedent).
- **Zod-level validation on `Column.size`/`precision`** — rejected: the
  schema is dialect-agnostic by design (parsed before a strategy is
  resolved); baking PostgreSQL-specific regexes into it would break
  SQLite's intentional looseness.
- **A `validation.ts` wrapper matching `describeNameValidity`'s shape** —
  rejected: no multi-check composition to justify one (see Design above).

## Open Questions

- Should `normalizeColumnForDialect` also silently clear
  eligible-but-malformed values found via file import? This is a live gap,
  not hypothetical: `parseSchemaFile` (`src/domain/schema/integrity.ts`,
  used by `LoadSchemaButton.tsx` for REQ-027's "load from a local file")
  already calls `normalizeColumnForDialect`, confirmed by
  `integrity.test.ts`'s existing "normalizes an invalid size/precision"
  tests — but that only clears _type-ineligible_ values (e.g. a `BOOLEAN`
  column with a stale `size`), not malformed values on a field that _is_
  eligible (e.g. a `VARCHAR` column imported with `size: "abc"`). Such a
  file, or an older saved schema predating this feature, would round-trip
  unnoticed until the next interactive edit of that column. Recommend: no,
  out of scope for this doc — file as its own follow-up if it proves to
  matter in practice, same pattern [0038](0038-fk-child-column-size-precision-inheritance.md)
  used for a similar deferred gap.
- Exact whitespace tolerance for the `NUMERIC` comma-pair (e.g. `"10, 2"`
  with a space)? Recommend: none — matches `IDENTIFIER_PATTERN`'s
  strictness precedent in `validation.ts`.
