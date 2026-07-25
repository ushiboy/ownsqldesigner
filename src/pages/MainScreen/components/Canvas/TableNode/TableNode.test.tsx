import { render, screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./TableNode.stories";

const { Default, WithComment, Selected, WithColumns, WithReferenceableColumn } =
  composeStories(stories);

describe("TableNode", () => {
  it("renders the table name", async () => {
    render(<Default />);
    expect(await screen.findByRole("button", { name: "Table users" })).toBeInTheDocument();
  });

  it("does not render a comment section when the comment is blank", async () => {
    render(<Default />);
    await screen.findByRole("button", { name: "Table users" });
    expect(screen.queryByText("Registered users")).not.toBeInTheDocument();
  });

  it("renders the comment when present", () => {
    render(<WithComment />);
    expect(screen.getByText("Registered users")).toBeInTheDocument();
  });

  it("applies the selected styling when selected", async () => {
    render(<Selected />);
    expect(await screen.findByRole("button", { name: "Table users" })).toHaveClass("border-accent");
  });

  it("does not render a column list when there are no columns", () => {
    render(<Default />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders each column's name when present", () => {
    render(<WithColumns />);
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
  });

  it("renders a source handle for every column but no target handle when none are referenceable", () => {
    const { container } = render(<WithColumns />);
    expect(container.querySelectorAll(".react-flow__handle-right")).toHaveLength(2);
    expect(container.querySelectorAll(".react-flow__handle-left")).toHaveLength(0);
  });

  it("renders a target handle only for a referenceable column (REQ-020)", () => {
    const { container } = render(<WithReferenceableColumn />);
    expect(container.querySelectorAll(".react-flow__handle-right")).toHaveLength(2);
    expect(container.querySelectorAll(".react-flow__handle-left")).toHaveLength(1);
  });
});
