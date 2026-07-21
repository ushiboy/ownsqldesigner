import { screen } from "@testing-library/react";
// storybook/test's userEvent (not the standalone @testing-library/user-event
// package): its default click also crashes React Flow's d3-zoom pane, which
// reads `event.view` from the dispatched mouse event and gets null from the
// standalone package.
import { userEvent } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Canvas.stories";

const { Default, WithTables, Selected } = composeStories(stories);

describe("Canvas", () => {
  it("renders the React Flow surface", async () => {
    await Default.run();
    expect(screen.getByTestId("rf__wrapper")).toBeInTheDocument();
  });

  it("renders a node per table", async () => {
    await WithTables.run();
    expect(await screen.findByRole("button", { name: "Table users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Table posts" })).toBeInTheDocument();
  });

  it("marks the selected table's node as selected", async () => {
    await Selected.run();
    expect(await screen.findByRole("button", { name: "Table users" })).toHaveClass("border-accent");
    expect(screen.getByRole("button", { name: "Table posts" })).not.toHaveClass("border-accent");
  });

  it("calls onSelectTable with the clicked table's id", async () => {
    await WithTables.run();

    await userEvent.click(await screen.findByRole("button", { name: "Table users" }));

    expect(WithTables.args.onSelectTable).toHaveBeenCalledExactlyOnceWith(
      "d4b2fa7b-8b86-4e4d-c1be-4e7f2c7b6a12",
    );
  });

  it("calls onSelectTable with null on a pane click", async () => {
    await WithTables.run();
    await screen.findByRole("button", { name: "Table users" });

    const pane = screen.getByTestId("rf__wrapper").querySelector(".react-flow__pane");
    if (pane === null) {
      throw new Error("expected the React Flow pane to be present");
    }
    await userEvent.click(pane);

    expect(WithTables.args.onSelectTable).toHaveBeenCalledExactlyOnceWith(null);
  });
});
