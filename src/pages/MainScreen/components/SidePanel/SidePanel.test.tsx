import { render, screen, within } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./SidePanel.stories";
import { SidePanel } from "./SidePanel";

const { Default } = composeStories(stories);

describe("SidePanel", () => {
  it("renders as a complementary landmark while open", async () => {
    await Default.run();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("is hidden from the accessibility tree while closed", () => {
    const { container } = render(<SidePanel isOpen={false} />);
    expect(within(container).queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("keeps its content mounted while closed so the width can animate", () => {
    const { container } = render(<SidePanel isOpen={false} />);
    expect(within(container).getByText("Schema")).toBeInTheDocument();
  });

  it("shows read-only schema metadata when nothing is selected", async () => {
    await Default.run();
    expect(screen.getByRole("heading", { name: "Schema" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });
});
