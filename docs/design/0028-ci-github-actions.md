# CI with GitHub Actions

- **Status**: Accepted
- **Created**: 2026-08-09
- **Updated**: 2026-08-09

## Context

The repo has no CI at all: `docs/rules/pre-commit-checks.md`'s five-step
sequence (`format` / `lint` / `typecheck` / `test` / `build`) and
`pnpm test:e2e` are only ever run locally, on the honor system. Both
[0027](0027-e2e-testing-with-playwright.md) (Open Questions) and
`docs/rules/testing.md` ("Out of scope today") flagged this as a deliberate,
known gap to close later. All 27 design docs are now `Implemented` and the
E2E layer's flow coverage is settled, so this is that later point.

`playwright.config.ts` already anticipates CI: `retries: process.env.CI ? 2
: 0`, `reporter: process.env.CI ? "github" : "html"`, and
`reuseExistingServer: !process.env.CI` are all conditioned on the `CI` env
var that GitHub Actions (and most CI providers) sets automatically, with no
workflow ever having existed to set it.

## Goals / Non-Goals

**Goals**

- A GitHub Actions workflow that runs on every push to `main` and every
  pull request: the pre-commit-checks sequence, plus `pnpm test:e2e`
  (closing the gap `pre-commit-checks.md` explicitly left for "a future
  change").
- Deterministic, reproducible installs (`pnpm install --frozen-lockfile`,
  a pinned pnpm version).

**Non-Goals**

- A multi-browser matrix (Firefox/WebKit) — 0027 already deferred this;
  nothing here changes that.
- `build` + `preview` instead of `dev` for the E2E job's `webServer` — noted
  as an open question in 0027, still open. `pnpm dev` is kept for this
  round; revisit if build-only regressions ever slip through.
- Caching Playwright's downloaded browser binaries across runs —
  `--with-deps chromium` installs fresh each run. Simpler to reason about
  for a first pass; worth adding if install time becomes a real cost.
- Deploy/publish steps, branch protection configuration, status-check
  requirements — this doc only adds the workflow itself.

## Design

### Two parallel jobs

`.github/workflows/ci.yml` defines two jobs, both triggered on
`push: { branches: [main] }` and `pull_request`:

- **`checks`** — `pnpm format:check` (see below), `pnpm lint`,
  `pnpm typecheck`, `pnpm test`, `pnpm build`, in that order, matching
  `pre-commit-checks.md` step-for-step except for the format step's mode.
- **`e2e`** — installs Playwright's Chromium binary
  (`pnpm exec playwright install --with-deps chromium`, matching
  `playwright.config.ts`'s single `chromium` project) and runs
  `pnpm test:e2e`. `playwright.config.ts`'s own `webServer` block starts
  `pnpm dev` for the job; no separate server-startup step is needed.

Split into two jobs (not one sequential job) so the fast jsdom-based checks
and the slower real-browser suite run concurrently — a `checks` failure is
visible without waiting on `e2e`, and vice versa. Both run on every push/PR
rather than gating `e2e` behind `checks` passing first: `pre-commit-checks.md`
already treats them as independent concerns (E2E is "irrelevant to commits
that don't touch canvas interactions" but that's a local-workflow
convenience, not a signal CI should skip it opportunistically).

### `pnpm format:check`, a new script

`pnpm format` (`oxfmt`) defaults to write mode — fine locally, wrong for CI
(a check that silently reformats files and still exits 0 tells you nothing).
`oxfmt --check` reports unformatted files and exits non-zero without writing.
`package.json` gains `"format:check": "oxfmt --check ."`, used only by the
`checks` job; `pre-commit-checks.md`'s local sequence keeps using
`pnpm format` (write mode) unchanged.

### Pinned toolchain

`package.json` gains `"packageManager": "pnpm@11.1.2"` (the version already
in local use, compatible with the committed lockfile's `lockfileVersion:
'9.0'`). `pnpm/action-setup` reads this field automatically, so the
workflow doesn't hardcode a version that can silently drift from what
contributors run locally. `actions/setup-node` runs after it with
`node-version: 24` (matching local Node) and `cache: pnpm`, then both jobs
run `pnpm install --frozen-lockfile` — fails fast if the lockfile and
`package.json` ever disagree, instead of silently re-resolving.

Every third-party Action reference is pinned to a full commit SHA (with the
release tag as a trailing comment for readability), not a floating major
tag like `@v7` — a compromised or force-moved tag would otherwise change
what code a workflow runs without any change to this repo. Each pin was
checked against its upstream repo before adopting, on two axes: provenance
(`actions/checkout` — official GitHub org, 8.6k+ stars; `pnpm/action-setup`
and `actions/setup-node` — official `pnpm`/GitHub orgs respectively, no open
`gh api repos/<owner>/<repo>/security-advisories` entries for any of the
three) and **age** — how long the specific pinned release has been out,
since a brand-new release has had the least time for the community to
notice something wrong with it:

| Action               | Pinned version | Released   | Age at pin time |
| -------------------- | -------------- | ---------- | --------------- |
| `actions/checkout`   | v7.0.1         | 2026-07-20 | ~3 weeks        |
| `pnpm/action-setup`  | v4.4.0         | 2026-03-13 | ~5 months       |
| `actions/setup-node` | v6.4.0         | 2026-04-20 | ~4 months       |

`pnpm/setup` — the action pnpm's own README now points to as the
`pnpm/action-setup` successor for pnpm v11+ — was tried first and reverted:
its whole repo is ~3 months old (first stable `v1` 2026-06-15, the `v2`
major this pin would need for pnpm v11+ only since 2026-08-04) with 80
stars, and its latest patch at review time was 2 days old. That combination
— new project, small install base, a release still within its first days —
is exactly the profile with the least time for anyone to have noticed a
problem, so the older, long-established `pnpm/action-setup` +
`actions/setup-node` pair was kept instead despite needing two actions
instead of one. Latest-available patches of each were deliberately not used
either
(`pnpm/action-setup` v6.0.10 and `actions/setup-node` v7.0.0/v6.5.0 were
all within the same ~1-week window as `pnpm/setup`'s release, for the same
reason) — each pin is the newest release of its line old enough to have
had real time in the wild, not simply the newest release available.
`actions/checkout` v7.0.1 is the exception kept close to latest (~3 weeks):
unlike the other two, it's GitHub's own core, extremely widely deployed
action, adopted and scrutinized at a scale that compresses how long
"enough time to notice a problem" actually takes.

## Alternatives Considered

- **One combined job (`checks` then `e2e` sequentially)** — rejected: no
  reason to make a `pnpm test:e2e` run wait behind `pnpm build` finishing
  first; they don't depend on each other's output.
- **Gate `e2e` on `checks` succeeding first** — rejected: both jobs installing
  dependencies independently is cheap, and failing E2E is useful signal even
  if, say, `pnpm lint` also happens to be broken by an unrelated change.
- **`vite build` + `vite preview` for the E2E job's server** — deferred, per
  0027's existing Open Question; no new information here to resolve it.
- **Folding this workflow's checks into `pre-commit-checks.md`'s required
  local sequence** — not applicable; CI is additive verification on
  push/PR, not a replacement for the local pre-commit gate.
- **`pnpm/setup`** (the newer, single-action replacement for
  `pnpm/action-setup` + `actions/setup-node`, now recommended by pnpm's own
  README for pnpm v11+) — tried first, then rejected for this round on
  freshness grounds alone (see the age table above), not on any functional
  problem found with it. Revisit once it has a longer track record; nothing
  else about it looked wrong.
- **Latest available patch of each action** (`pnpm/action-setup` v6.0.10,
  `actions/setup-node` v7.0.0) — rejected for the same freshness reason:
  each was released within about a week of this doc, no more vetted by
  the community than `pnpm/setup` was.
- **Floating major-version tags (`@v7`, `@v4`)** — rejected: a tag can be
  force-moved to point at different code without any diff in this repo,
  unlike a commit SHA. Pinned to a SHA with the resolved tag as a comment
  instead.

## Open Questions

- Whether to add branch protection requiring these checks before merge
  (a repo-settings change, not a workflow-file change — out of scope here).
- Whether/when to cache Playwright's browser binaries once install time is
  measured against real CI run history.
