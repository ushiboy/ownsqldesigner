# ownsqldesigner

A SQL designer SPA built with React 19 + TypeScript + Vite, managed with pnpm.
Tooling: oxfmt (format), oxlint (lint), tsc (typecheck), Vitest (test), Storybook.

## Commands

| Task       | Command          |
| ---------- | ---------------- |
| Format     | `pnpm format`    |
| Lint       | `pnpm lint`      |
| Typecheck  | `pnpm typecheck` |
| Test       | `pnpm test`      |
| E2E test   | `pnpm test:e2e`  |
| Build      | `pnpm build`     |
| Dev server | `pnpm dev`       |
| Storybook  | `pnpm storybook` |

## Documentation

- [Requirements](docs/requirements.md) — What the app does and its feature list (living document)
- Design docs live in `docs/design/` — see the Design Docs rule below

## Rules

You MUST read and follow all rules in `docs/rules/`:

- [Pre-Commit Checks](docs/rules/pre-commit-checks.md) — Required verification steps before every commit
- [Code Organization](docs/rules/code-organization.md) — Ordering of exports, private helpers, constants, and types within a file
- [Component Design](docs/rules/component-design.md) — When to split a component into pure functions, a custom Hook, or Container/Presentation
- [Testing](docs/rules/testing.md) — How to add tests and stories for new code
- [Design Docs](docs/rules/design-docs.md) — Where to place design docs and what to write in them

### Adding a new rule

1. Create a new Markdown file in `docs/rules/` (one topic per file, written in English).
2. Add a link to it in the Rules list above.
