import { render, screen } from "@testing-library/react";
// storybook/test's userEvent (not the standalone @testing-library/user-event
// package): its default click also crashes React Flow's d3-zoom pane, which
// reads `event.view` from the dispatched mouse event and gets null from the
// standalone package.
import { fn, userEvent } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Canvas.stories";

const { Default, WithTables, Selected, MultiSelected, WithRelation, RelationSelected } =
  composeStories(stories);

// Story.run() mounts into its own React root via ReactDOM.createRoot,
// bypassing @testing-library/react's auto-cleanup entirely (confirmed by
// reading @storybook/react-dom-shim's renderer). Its container is only
// removed at the start of the *next* run()/load() call, so a run()-driven
// test's leftover node stays queryable — and reachable by role — in every
// later test unless something forces that flush here. load() does the same
// internal flush without rendering anything of its own, so it's a clean way
// to trigger it after every test.
afterEach(async () => {
  await Default.load();
});

describe("Canvas", () => {
  it("renders the React Flow surface", () => {
    render(<Default />);
    expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
  });

  it("renders zoom controls", () => {
    render(<Default />);
    expect(screen.getByRole("button", { name: /zoom in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /zoom out/i })).toBeInTheDocument();
  });

  it("renders a node per table", async () => {
    render(<WithTables />);
    expect(await screen.findByRole("button", { name: "Table users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table posts" })).toBeInTheDocument();
  });

  it("marks the selected table's node as selected", async () => {
    await Selected.run();
    expect(screen.getByRole("button", { name: "Table users" })).toHaveClass("border-accent");
    expect(screen.getByRole("button", { name: "Table posts" })).not.toHaveClass("border-accent");
  });

  it("marks every multi-selected table's node as selected", async () => {
    await MultiSelected.run();
    expect(screen.getByRole("button", { name: "Table users" })).toHaveClass("border-accent");
    expect(screen.getByRole("button", { name: "Table posts" })).toHaveClass("border-accent");
  });

  it("calls onTableSelectionChange with the clicked table's id", async () => {
    // React Flow's selection listener also echoes the (empty) initial
    // selection once on mount, so the click's effect is asserted as the
    // most recent call rather than the only one.
    const onTableSelectionChange = fn();
    render(<WithTables onTableSelectionChange={onTableSelectionChange} />);

    await userEvent.click(await screen.findByRole("button", { name: "Table users" }));

    expect(onTableSelectionChange).toHaveBeenLastCalledWith([
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    ]);
  });

  it("calls onTableSelectionChange with an empty array on a pane click", async () => {
    // .run()'s extraContext is Object.assign'd onto the story context, so
    // `args` must be spread from the story's own args rather than passed as
    // a partial override — otherwise it replaces `tables` with `undefined`.
    const onTableSelectionChange = fn();
    await Selected.run({ args: { ...Selected.args, onTableSelectionChange } });

    const pane = screen.getByTestId("rf__wrapper").querySelector(".react-flow__pane");
    if (pane === null) {
      throw new Error("expected the React Flow pane to be present");
    }
    await userEvent.click(pane);

    expect(onTableSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("renders a foreign-key edge between the connected columns", async () => {
    render(<WithRelation />);
    await screen.findByRole("button", { name: "Table users" });

    expect(
      screen.getByTestId("rf__wrapper").querySelector(".react-flow__edge"),
    ).toBeInTheDocument();
  });

  it("highlights the edge belonging to the selected relation", async () => {
    render(<RelationSelected />);
    await screen.findByRole("button", { name: "Table users" });

    expect(
      screen.getByTestId("rf__wrapper").querySelector(".react-flow__edge.selected"),
    ).toBeInTheDocument();
  });

  it("calls onSelectRelation with the clicked edge's id", async () => {
    const onSelectRelation = fn();
    render(<WithRelation onSelectRelation={onSelectRelation} />);
    await screen.findByRole("button", { name: "Table users" });

    const edge = screen.getByTestId("rf__wrapper").querySelector(".react-flow__edge-interaction");
    if (edge === null) {
      throw new Error("expected the edge's interaction path to be present");
    }
    await userEvent.click(edge);

    expect(onSelectRelation).toHaveBeenCalledExactlyOnceWith(
      "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    );
  });

  it("calls onSelectRelation with null on a pane click", async () => {
    const onSelectRelation = fn();
    render(<WithRelation onSelectRelation={onSelectRelation} />);
    await screen.findByRole("button", { name: "Table users" });

    const pane = screen.getByTestId("rf__wrapper").querySelector(".react-flow__pane");
    if (pane === null) {
      throw new Error("expected the React Flow pane to be present");
    }
    await userEvent.click(pane);

    expect(onSelectRelation).toHaveBeenCalledExactlyOnceWith(null);
  });
});
