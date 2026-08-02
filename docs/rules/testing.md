# Testing

## When

Every time you add or modify a React component, page, hook, or any other logic. New code MUST be accompanied by tests (and stories, for UI components) in the same change.

## What

Tests run with Vitest (configured inside `vite.config.ts`: jsdom environment, `globals: true`, setup in `src/test/setup.ts`). `describe` / `it` / `expect` are available as globals — do not import them. Storybook preview annotations are wired into Vitest in the setup file, so stories render in tests via `composeStories` with the same decorators and globals as Storybook.

Choose the testing style by the kind of code (see [Component Design](component-design.md) for how to decide which of these a piece of logic belongs in, and how test scope narrows as Hook/Presentation/Container layers separate):

| Kind of code                             | How to test                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| UI component / page                      | Render via `composeStories`, assert with Testing Library in the test file; stories stay assertion-free |
| Routing / integration (e.g. `AppRoutes`) | Plain Testing Library test with `MemoryRouter` + `initialEntries`; no stories                          |
| Hooks                                    | Plain Vitest test using `renderHook` from `@testing-library/react`                                     |
| Pure functions / non-UI logic            | Plain Vitest test (`*.test.ts`)                                                                        |

## Rules

### File placement and naming

- Co-locate tests and stories with the source file: `Table.tsx` → `Table.test.tsx` + `Table.stories.tsx`. Never create `__tests__/` directories.
- Name test files `<Name>.test.ts(x)` and story files `<Name>.stories.tsx`.
- Use `describe("<ComponentOrFunctionName>", ...)` with behavior-phrased `it("...")` blocks.
- Within a test file, put shared helper functions (fixture builders, etc.) before the `describe` block(s) that use them, ordered by their own internal dependencies — then the specs. This is the reverse of [Code Organization](code-organization.md)'s rule for regular source files (helpers go at the bottom there): a test file reads top-to-bottom as setup followed by scenarios, not public API followed by implementation.

### UI components and pages

- Create `<Name>.stories.tsx` as a visual catalog of the component's representative states for Storybook.
- Stories MUST NOT contain assertions. A `play` function MAY be used only to put the component into a state worth inspecting visually (e.g., clicking a button to show a post-interaction state) — never to verify behavior.
- In `<Name>.test.tsx`, render the component by rendering its composed stories directly: `const { Default } = composeStories(stories)` then `render(<Default />)`. A composed story is usable as a React component, so this keeps tests rendering exactly what Storybook shows (same args, decorators, and `parameters`).
- Override specific args per test by passing props: `render(<Default onSubmit={onSubmit} />)` with a test-local `fn()` (from `storybook/test`) — assert on that local mock rather than the story file's own `args.onSubmit`, so the test's expectations don't depend on the story's internal wiring. That idiom assumes the callback IS a prop; when the component under test owns real state instead (see the next rule), prefer asserting the resulting UI over asserting mock calls.
- When a component's state lives in Context rather than in props, seed it through **args consumed by a `render` harness**, never through `parameters`. Point `component` at whatever the harness actually mounts (its props become the args type; a `component` whose props differ from the args silently wins), give the meta a `render` that mounts the seeded provider stack, and name the seed props `initialX`. Parameters cannot be overridden through a composed story, so seeding through them would force a new story for every test variation; args keep `render(<Story initialX={...} />)` working.
- When introducing a new Context/Provider that many components will end up depending on, audit which existing `.stories.tsx` files render those components standalone and add the new provider to each (as a decorator, or into the file's own seeded-provider wrapper) as part of that same change — don't wait for each story's test to fail one at a time. If the provider throws when unwrapped (no library-level default), every affected story needs it; if it has a safe default, story-level wrapping is only required where a test needs a non-default value.
- Use `Story.run()` instead of `render(<Story />)` only when the story has a `play` function that must execute first — `render()` does not invoke `play`, so a story relying on it needs `await Story.run()` (optionally with an `{ args }` override) to reach the post-play state.
- Verify ALL behavior (rendering, interactions, prop branches, edge cases) with Testing Library assertions in the test file.
- Prefer rendering an existing story as the starting point of a test, overriding only the args needed. Only fall back to a plain `render(<Component ... />)` with hand-built props when the state under test is not worth cataloging as a story at all.

### Test data

- Use fixed, deterministic data in tests and stories: no random values, no current date/time (use hardcoded dates), no data that changes between runs. Stories will later serve as visual regression testing targets, so their rendering must be identical on every run.
- Any test that exercises a hook/provider persisting to `localStorage` (or other browser storage) MUST clear it in `beforeEach`. Real browser storage isn't reset between tests in the same file automatically, so a value written by one test (e.g. switching a stored preference) otherwise leaks into the next test's initial render.

### Queries and interactions

- Prefer role-based queries (`getByRole("button", { name: ... })`) over test IDs or text queries.
- Assert with jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`, `toBeVisible`, ...).
- Simulate user interaction with `@testing-library/user-event`: `userEvent.setup()` + `await user.click(...)`.
- When a rendered tree can contain more than one element with the same accessible name at once (e.g. a "Name" field open in both a dialog and an inline form elsewhere on the page), scope the query with `within(container)` instead of querying from `screen` — a page-level `getByLabelText`/`getByRole` call throws on multiple matches.

## Example

`Home.test.tsx` — renders via `composeStories`, all assertions live here:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Home.stories";

const { Default } = composeStories(stories);

describe("Home", () => {
  it("renders the heading", () => {
    render(<Default />);
    expect(screen.getByRole("heading", { name: "Get started" })).toBeInTheDocument();
  });

  it("increments the counter on click", async () => {
    const user = userEvent.setup();
    render(<Default />);

    const button = screen.getByRole("button", { name: "Count is 0" });
    await user.click(button);

    expect(button).toHaveTextContent("Count is 1");
  });
});
```

`Home.stories.tsx` — a catalog of states, no assertions:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite";
import Home from "@/pages/Home";

const meta = {
  title: "pages/Home",
  component: Home,
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```
