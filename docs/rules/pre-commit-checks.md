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
