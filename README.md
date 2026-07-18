# ownsqldesigner

A SPA for designing database schemas (E-R diagrams) visually in the browser and exporting them as SQL (DDL). No server required — editing, persistence, and export all happen entirely in the browser.

## Features

- Visual schema editing on a pannable canvas: place, drag, and delete table nodes
- Table and column definition (name, type, size, default value, nullable, auto-increment, comment)
- Keys and relations: PRIMARY KEY / UNIQUE / INDEX (including composite keys) and foreign-key relations with auto-routed connectors
- Integrity validation with clear feedback when an edit is rejected
- Save, list, and load named schemas in browser storage
- SQL (DDL) export — SQLite dialect initially, designed so new dialects can be added without rewriting core features

See [docs/requirements.md](docs/requirements.md) for the full feature list and implementation phases.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) (with tailwind-variants)
- [React Router](https://reactrouter.com/)
- Tooling: [oxfmt](https://oxc.rs/) (format), [oxlint](https://oxc.rs/) (lint), [Vitest](https://vitest.dev/) (test), [Storybook](https://storybook.js.org/)

## Getting Started

Requires [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).

```sh
pnpm install
pnpm dev
```

## Commands

| Task         | Command           |
| ------------ | ----------------- |
| Dev server   | `pnpm dev`        |
| Build        | `pnpm build`      |
| Preview      | `pnpm preview`    |
| Test         | `pnpm test`       |
| Test (watch) | `pnpm test:watch` |
| Typecheck    | `pnpm typecheck`  |
| Lint         | `pnpm lint`       |
| Format       | `pnpm format`     |
| Storybook    | `pnpm storybook`  |

## Documentation

- [Requirements](docs/requirements.md) — what the app does and its feature list
- `docs/design/` — design docs describing how features are built
- `docs/rules/` — development rules (pre-commit checks, code organization, testing, design docs)

## License

[MIT](LICENSE)
