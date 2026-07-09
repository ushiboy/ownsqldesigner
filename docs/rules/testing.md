# Testing

## When

Every time you add or modify a React component, page, hook, or any other logic. New code MUST be accompanied by tests (and stories, for UI components) in the same change.

## What

Tests run with Vitest (configured inside `vite.config.ts`: jsdom environment, `globals: true`, setup in `src/test/setup.ts`). `describe` / `it` / `expect` are available as globals — do not import them. Storybook preview annotations are wired into Vitest in the setup file, so stories render in tests via `composeStories` with the same decorators and globals as Storybook.

Choose the testing style by the kind of code:

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

### UI components and pages

- Create `<Name>.stories.tsx` as a visual catalog of the component's representative states for Storybook.
- Stories MUST NOT contain assertions. A `play` function MAY be used only to put the component into a state worth inspecting visually (e.g., clicking a button to show a post-interaction state) — never to verify behavior.
- In `<Name>.test.tsx`, render the component by running its stories: `const { Default } = composeStories(stories)` then `await Default.run()`. This keeps tests rendering exactly what Storybook shows (same args and decorators).
- Note that `run()` also executes the story's `play` function — a test that runs a story with a `play` starts from the post-play state, not the initial render.
- Verify ALL behavior (rendering, interactions, prop branches, edge cases) with Testing Library assertions in the test file, after `run()`.
- Prefer running an existing story as the starting point of a test. Only fall back to a plain `render(<Component ... />)` when the state under test is not worth cataloging as a story.

### Test data

- Use fixed, deterministic data in tests and stories: no random values, no current date/time (use hardcoded dates), no data that changes between runs. Stories will later serve as visual regression testing targets, so their rendering must be identical on every run.

### Queries and interactions

- Prefer role-based queries (`getByRole("button", { name: ... })`) over test IDs or text queries.
- Assert with jest-dom matchers (`toBeInTheDocument`, `toHaveTextContent`, `toBeVisible`, ...).
- Simulate user interaction with `@testing-library/user-event`: `userEvent.setup()` + `await user.click(...)`.

## Example

`Home.test.tsx` — renders via `composeStories`, all assertions live here:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Home.stories";

const { Default } = composeStories(stories);

describe("Home", () => {
  it("renders the heading", async () => {
    await Default.run();
    expect(screen.getByRole("heading", { name: "Get started" })).toBeInTheDocument();
  });

  it("increments the counter on click", async () => {
    const user = userEvent.setup();
    await Default.run();

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
