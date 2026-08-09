# Pre-Commit Checks

## When

Every time you have implemented or modified code, before creating a commit.

## What

Run the following commands in order and make sure every one of them succeeds:

1. `pnpm format` — format the code with oxfmt
2. `pnpm lint` — lint the code with oxlint
3. `pnpm typecheck` — type-check with `tsc -b` (required: `pnpm build` does NOT type-check)
4. `pnpm test` — run the test suite with `vitest run`
5. `pnpm build` — create a production build with `vite build`

## Rules

- If any step fails, fix the problem and re-run ALL steps from the beginning before committing.
- If `pnpm format` changes any files, include those changes in the commit.
- Never commit while any of the checks above is failing.
- Use `pnpm typecheck` for any type-check verification, including quick mid-task sanity checks — not only the final pre-commit pass. Ad-hoc invocations like `tsc --noEmit -p .` do not go through the same composite/incremental build (`tsc -b`) this project relies on, and can silently report success on code that `pnpm typecheck` would fail (e.g. a `declare module` type augmentation that isn't picked up). A "quick check" that isn't the real command isn't a check.
- `pnpm test:e2e` (Playwright, see [E2E Tests](testing.md#e2e-tests)) is deliberately **not** part of this sequence: it's slower and more timing-sensitive than the jsdom-based `pnpm test`, and irrelevant to commits that don't touch canvas interactions. Run it manually when relevant. CI (see [0028](../design/0028-ci-github-actions.md)) runs it on every push/PR, so gaps still get caught even though it isn't a local pre-commit requirement.
