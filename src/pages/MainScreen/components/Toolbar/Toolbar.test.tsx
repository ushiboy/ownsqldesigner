import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./Toolbar.stories";

const { Default, SidePanelClosed } = composeStories(stories);

describe("Toolbar", () => {
  it("renders the schema dropdown trigger with the schema name", async () => {
    await Default.run();
    expect(screen.getByRole("button", { name: "Blog Schema" })).toBeInTheDocument();
  });

  it("renders the schema action and editor action buttons", async () => {
    await Default.run();
    expect(screen.getByRole("button", { name: "Rename schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete schema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Table" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export SQL" })).toBeInTheDocument();
  });

  it("calls onToggleSidePanel when the side panel toggle is clicked", async () => {
    await Default.run();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle side panel" }));
    expect(Default.args.onToggleSidePanel).toHaveBeenCalledOnce();
  });

  it("marks the side panel toggle as pressed while the panel is open", async () => {
    await Default.run();
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("marks the side panel toggle as not pressed while the panel is closed", async () => {
    await SidePanelClosed.run();
    expect(screen.getByRole("button", { name: "Toggle side panel" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
