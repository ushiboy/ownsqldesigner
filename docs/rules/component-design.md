# Component Design

## When

Every time you create or modify a React component.

## What

Design components around **responsibility**, not around patterns. Do not apply the Container/Presentation pattern to every component by default — start with the simplest implementation that cleanly expresses the component's responsibility, and introduce additional layers (pure functions, custom Hooks, Container/Presentation) only when they provide clear value. The goal is to minimize complexity while keeping components easy to understand, test, and evolve.

## Rules

### Start simple

Small UI components (e.g. Button, SearchBox, Dialog, Dropdown, FormField) start as a single component. Local UI state — focus, hover, open/close, temporary input, selected tab — does not on its own justify a Container or custom Hook. A single component with local `useState` is preferred while the responsibility stays small.

### Extract logic incrementally

As complexity grows, extract logic into the abstraction that matches it:

- **Pure function** — for logic that does not depend on React state or lifecycle: data transformation, filtering, sorting, formatting, validation, derived calculations. Pure functions have no Hook restrictions and are the easiest to reuse and unit test.
- **Custom Hook** — for logic that depends on React state or lifecycle: complex state transitions, keyboard shortcuts, debouncing, async operations, derived state, reusable React behavior. The component may still render the UI directly (`const vm = useSearchBox(); return (...)`) — this does not by itself justify a Presentation component.

### Introduce Container/Presentation only when responsibilities diverge

Split into Container + Presentation when there is a clear separation between application logic and UI rendering — e.g. the UI needs its own Storybook catalog or independent testing, the business logic is complex, or multiple people work on UI and logic separately. The Presentation component should behave like a pure function of its props. Follow the existing naming convention: `<Name>.tsx` (container, default export, owns state/handlers, renders the view) + `<Name>View.tsx` (presentational, named export, fully props-driven), co-located in the same directory (see `src/pages/MainScreen/` for an example).

### Large screens (pages) start separated

Page-level components almost always have multiple responsibilities from the start — routing, URL sync, data access, loading/error state, dialogs, filters, pagination — so they should generally begin with a Container/Presentation split rather than growing into one later.

### State ownership

Ask: does another component need to know this state?

- **No** → keep it local (focus, hover, expanded, temporary animation state).
- **Yes** → lift it into the nearest Container or custom Hook (search keyword, current page, sorting, selected entity, fetched data).

Favor responsibility over reusability: do not merge two visually identical components into one configurable component if their responsibilities or contexts differ. Prefer separate components over a single component with an ever-growing prop list.

### Check for existing duplication before writing new logic

Before adding a new effect, handler, or small utility to a component, search the codebase for the same logic already written elsewhere (e.g. `grep` for a distinctive string or pattern from what you're about to write). If the code you're about to add would be the **third** occurrence of the same logic, extract a shared hook or function instead of copying it again — don't wait for a code review to point out the duplication. A component-scoped hooks directory (e.g. `src/pages/MainScreen/hooks/`) is for that page's own logic; logic shared across pages or with components outside `pages/` belongs in a shared location instead (e.g. `src/components/hooks/`).

### When to refactor

Do not split components preemptively. Let complexity signal when to refactor — typical indicators:

- The component has multiple unrelated responsibilities.
- Tests become long, hard to understand, or need many setup steps.
- The same interaction sequence repeats across tests.
- Tests need many `waitFor()` / `act()` calls.
- Business logic dominates UI code.
- Extracting a Hook would clearly simplify the tests.

If testing becomes difficult because responsibilities are mixed, separate the responsibilities rather than writing increasingly complex tests.

## Testing

Test scope follows the same boundaries — see [Testing](testing.md) for how to write each kind of test:

- **Small (unsplit) component** — one integration-style test against the component itself.
- **Pure functions** — plain unit tests.
- **Custom Hook** — the majority of business logic tests (state transitions, edge cases, business rules, derived values), avoiding UI rendering where possible.
- **Presentation component** — UI behavior only (rendering props, invoking callbacks, accessibility, conditional rendering), never business logic.
- **Container component** — a small number of integration tests covering representative user flows and that state/callbacks wire correctly into the Presentation and Hook; leave exhaustive business-logic and edge-case coverage to the Hook tests.

As responsibilities separate more clearly, tests should get simpler and more focused — don't introduce a layer before it earns its keep.
