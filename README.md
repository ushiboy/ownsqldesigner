# ownsqldesigner

A SPA for designing database schemas (E-R diagrams) visually in the browser and exporting them as SQL (DDL). No server required — editing, persistence, and export all happen entirely in the browser.

🔗 [Live demo](https://ushiboy.github.io/ownsqldesigner/)

## Inspiration

This project is a homage to [wwwsqldesigner](https://github.com/ondras/wwwsqldesigner), a web-based ER diagram tool that has been a great source of inspiration.
It is a simple experiment to explore what a similar tool might look like with a modern tech stack.
Huge respect and thanks to the original creators!

## Features

- Visual schema editing on a pannable canvas: place, drag, and delete table nodes
- Table and column definition (name, type, size, default value, nullable, auto-increment, comment)
- Keys and relations: PRIMARY KEY / UNIQUE / INDEX (including composite keys) and foreign-key relations with auto-routed connectors
- Integrity validation with clear feedback when an edit is rejected
- Save, list, and load named schemas in browser storage
- SQL (DDL) export for SQLite and PostgreSQL, designed so new dialects can be added without rewriting core features
- Export the schema as a Mermaid ER diagram, with copy/download and a live preview
- Undo/redo and keyboard shortcuts
- Dark mode and Japanese/English UI switching

See [docs/requirements.md](docs/requirements.md) for the full feature list and implementation phases.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/) (with tailwind-variants)
- [React Router](https://reactrouter.com/)
- [@xyflow/react](https://reactflow.dev/) (React Flow) for the canvas, [dagre](https://github.com/dagrejs/dagre) for auto-align
- [Mermaid](https://mermaid.js.org/) for ER diagram export, [Zod](https://zod.dev/) for validation, [use-intl](https://use-intl.dev/) for i18n
- Tooling: [oxfmt](https://oxc.rs/) (format), [oxlint](https://oxc.rs/) (lint), [Vitest](https://vitest.dev/) (test), [Playwright](https://playwright.dev/) (E2E test), [Storybook](https://storybook.js.org/)

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
| E2E test     | `pnpm test:e2e`   |
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
