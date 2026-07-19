import { render, screen, within } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./SidePanel.stories";
import { SidePanel } from "./SidePanel";

const { Default } = composeStories(stories);

const closedProps = {
  isOpen: false,
  schemaName: "Blog Schema",
  tableCount: 0,
  createdDate: "2026-07-01",
};

describe("SidePanel", () => {
  it("renders as a complementary landmark while open", async () => {
    await Default.run();
    expect(screen.getByRole("complementary", { name: "Side panel" })).toBeInTheDocument();
  });

  it("is hidden from the accessibility tree while closed", () => {
    const { container } = render(<SidePanel {...closedProps} />);
    expect(within(container).queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("keeps its content mounted while closed so the width can animate", () => {
    const { container } = render(<SidePanel {...closedProps} />);
    expect(within(container).getByText("Schema")).toBeInTheDocument();
  });

  it("shows the schema metadata", async () => {
    await Default.run();
    expect(screen.getByRole("heading", { name: "Schema" })).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Blog Schema")).toBeInTheDocument();
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });
});
