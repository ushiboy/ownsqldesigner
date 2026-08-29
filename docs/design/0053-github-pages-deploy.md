# GitHub Pages Deployment

- **Status**: Implemented
- **Created**: 2026-08-29
- **Updated**: 2026-08-29

## Context

The app has no hosting today. [0028](0028-ci-github-actions.md) added CI but its
Non-Goals explicitly deferred "deploy/publish steps" to a future doc — this is
that doc. GitHub Pages was chosen as the target, as a project page under
`ushiboy/ownsqldesigner` (`https://ushiboy.github.io/ownsqldesigner/`).

Two problems have to be solved together:

- GitHub Pages serves static files only, with no server-side rewrite support.
  `react-router`'s `BrowserRouter` (`src/App.tsx`) relies on the server
  returning `index.html` for any path so the client can take over routing;
  without that, a hard navigation or reload on `/settings` 404s.
- Deploys must be triggered manually (`workflow_dispatch`) rather than on
  every push to `main`, and must always build whatever is currently on `main`
  regardless of which ref the workflow was manually run against.

## Goals / Non-Goals

**Goals**

- A GitHub Actions workflow, triggered only by `workflow_dispatch`, that
  builds the latest `main` and deploys it to GitHub Pages.
- Client-side routing (deep links, reloads) works correctly under the
  `/ownsqldesigner/` subpath, using the
  [rafgraph/spa-github-pages](https://github.com/rafgraph/spa-github-pages)
  404-redirect pattern.
- No behavior change to local dev (`pnpm dev`), `pnpm build`, or the existing
  `ci.yml` workflow's `checks`/`e2e` jobs (the `e2e` job also runs a real
  `vite build` for its Playwright `webServer`).

**Non-Goals**

- Automatic deploy on push/merge to `main` — deploys are explicitly
  manual-only per requirement.
- Custom domain.
- Deployment approval gates or other `github-pages` environment protection
  rules beyond GitHub's defaults.
- Staging/multi-environment setup.

## Design

### Conditional `base`, not a hardcoded one

`playwright.config.ts` hardcodes `baseURL: "http://localhost:5173"`, and
`e2e/fixtures/cleanStorage.ts` does `page.goto("/")`. The `ci.yml` `e2e` job
runs `pnpm build && vite preview` (a real production build) against that same
root-relative URL. Hardcoding `base: "/ownsqldesigner/"` in `vite.config.ts`
would break all of that, plus local `pnpm dev`.

Instead, `vite.config.ts` reads an env var that only the deploy workflow sets:

```ts
base: process.env.GITHUB_PAGES ? "/ownsqldesigner/" : "/",
```

`GITHUB_PAGES` is set only on the deploy workflow's `pnpm build` step (not at
job or workflow level), so it can't leak into any other step or workflow.
Everywhere else — local dev, `pnpm build` in `checks`, the `e2e` job's own
build — keeps the existing `base: "/"` behavior untouched.

### `basename` tracks `base` automatically

`src/App.tsx`'s `<BrowserRouter>` gets
`basename={import.meta.env.BASE_URL}`. Vite's `BASE_URL` always reflects the
resolved `base` config, so this needs no separate configuration and stays in
sync with the `vite.config.ts` change above (`"/"` normally, `"/ownsqldesigner/"`
only in the GitHub Pages build).

### rafgraph 404-redirect pattern

- `public/404.html` (new): implements rafgraph's redirect script with
  `pathSegmentsToKeep = 1` (the one path segment, `/ownsqldesigner`, that must
  be preserved on a project page). Placed in `public/` so Vite copies it
  verbatim to `dist/404.html`; GitHub Pages serves this automatically for any
  request that doesn't match a static file.
- `index.html` (modified): gets the matching restoration `<script>` as the
  first child of `<head>` (before the favicon `<link>`), which reads the
  redirect's encoded query string and calls `history.replaceState` to restore
  the real URL before React mounts. A no-op on any normal (non-redirected)
  load.
- `index.html`'s favicon reference changes from `href="/favicon.svg"` to
  `href="%BASE_URL%favicon.svg"` — Vite's documented placeholder for
  base-aware raw asset references in `index.html`. Resolves to the same
  `/favicon.svg` when `base` is `/` (the common case), so this is a no-op
  everywhere except the GitHub Pages build.

**Request flow, confirmed to have no double-redirect or conflict with the
app's own `NotFound` route:** a hard navigation/reload on
`/ownsqldesigner/settings` doesn't match a static file, so GitHub Pages serves
`404.html`. Its script rewrites the URL to `/ownsqldesigner/?/settings` and
navigates there — that _does_ resolve to a real file (`index.html`; the query
string doesn't affect static-file resolution), so it's served with a normal
200, not another 404. `index.html`'s restoration script sees the encoded
query string, restores `/ownsqldesigner/settings` via `history.replaceState`,
and only then does React mount. `<BrowserRouter basename={...}>` reads that
now-correct location and routes exactly as it would for in-app navigation —
`AppRoutes`'s catch-all `*` route (rendering `NotFound`) only fires for a
genuinely unmatched path, same as today.

### Deploy workflow: `.github/workflows/deploy.yml`

Manual-only (`workflow_dispatch`, no other trigger), two jobs following the
official `actions/deploy-pages` pattern:

- **`build`** — checks out `main` explicitly (`ref: main`, so a
  `workflow_dispatch` accidentally run against another branch still deploys
  `main`'s code), installs deps, runs `pnpm build` with `GITHUB_PAGES: true`
  scoped to that one step, then uploads `dist` via
  `actions/configure-pages` + `actions/upload-pages-artifact`.
- **`deploy`** — runs `actions/deploy-pages`, gated behind the `github-pages`
  deployment `environment` (which also surfaces the published URL as
  `steps.deployment.outputs.page_url`). Split into its own job because the
  `environment:`/`page_url` output convention is built around a
  build/deploy split, and it scopes GitHub's own environment protection to
  the publish step only.

`permissions` is the minimum the official Actions-based Pages deploy needs,
nothing broader:

| Permission        | Why                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contents: read`  | `actions/checkout` reading the source — no write access needed.                                                                                                                     |
| `pages: write`    | Publishing the build to GitHub Pages.                                                                                                                                               |
| `id-token: write` | `actions/deploy-pages` exchanges this for a short-lived OIDC token to authenticate the deploy call as coming from this specific workflow run/repo/ref, instead of a long-lived PAT. |

`concurrency: { group: pages, cancel-in-progress: false }` prevents two
manual runs from racing; queuing (rather than cancelling) an in-flight deploy
avoids leaving a half-published Pages site.

### Action pinning

Every third-party Action is pinned to a full commit SHA with its resolved
version tag as a trailing comment, matching `ci.yml`'s existing convention
(see [0028](0028-ci-github-actions.md#pinned-toolchain) for the full
rationale). `actions/checkout`, `pnpm/action-setup`, and `actions/setup-node`
reuse the exact SHAs already pinned in `ci.yml`. The three Pages-specific
actions were vetted the same way (checked 2026-08-29, no advisories found on
any):

| Action                          | Pinned version | Released   | Age at pin time |
| ------------------------------- | -------------- | ---------- | --------------- |
| `actions/configure-pages`       | v6.0.0         | 2026-03-25 | ~5 months       |
| `actions/upload-pages-artifact` | v5.0.0         | 2026-04-10 | ~4.5 months     |
| `actions/deploy-pages`          | v5.0.0         | 2026-03-25 | ~5 months       |

All three are GitHub's own `actions/*` org, each pin is that action's current
latest major release (no newer release exists to prefer or avoid), and each
has had several months in the wild — consistent with 0028's provenance/age
bar.

### Manual prerequisite (not automatable via workflow file)

- **Settings → Pages → Build and deployment → Source must be set to "GitHub
  Actions"** (not "Deploy from a branch") before this workflow can succeed —
  a repo-admin action, called out here since merging the workflow file alone
  doesn't make deploys work.
- Operational note: run `workflow_dispatch` with `main` selected in the
  Actions UI. `ref: main` on `actions/checkout` guarantees the source is
  always `main` regardless, but the `github-pages` environment's own
  (GitHub-managed) branch protection is evaluated against the ref the
  workflow run itself was dispatched against, and could reject the deploy job
  if it doesn't allow that ref.

## Alternatives Considered

- **`HashRouter`** instead of `BrowserRouter` + the 404 hack — rejected: URLs
  like `/#/settings` are uglier, and the rafgraph pattern was the explicit
  requirement.
- **Hardcoding `base: "/ownsqldesigner/"` unconditionally** — rejected: breaks
  local dev and the `ci.yml` `e2e` job's real `vite build` + `vite preview`,
  both of which assume a root-relative `/`.
- **`gh-pages` branch deploy** (e.g. `peaceiris/actions-gh-pages`) — rejected
  in favor of GitHub's own `actions/configure-pages` /
  `actions/upload-pages-artifact` / `actions/deploy-pages`, which avoid
  maintaining an extra branch and match this repo's existing preference for
  official `actions/*`-org actions.
- **Deploy on push to `main`** (matching `ci.yml`'s trigger) — rejected per
  the explicit manual-deploy requirement.
- **A single combined build+deploy job** — rejected: the `environment:` /
  `page_url` output convention is designed around a two-job split, and
  splitting also scopes any future environment protection rule to the
  publish step alone.

## Open Questions

- Whether to add `github-pages` environment protection rules (e.g. required
  reviewers) later — out of scope here per Non-Goals; the requirement today
  is "manual dispatch deploys," not an approval gate.
