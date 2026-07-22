import { screen } from "@testing-library/react";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./TableNode.stories";

const { Default, WithComment, Selected, WithColumns } = composeStories(stories);

describe("TableNode", () => {
  it("renders the table name", async () => {
    await Default.run();
    expect(await screen.findByRole("button", { name: "Table users" })).toBeInTheDocument();
  });

  it("does not render a comment section when the comment is blank", async () => {
    await Default.run();
    await screen.findByRole("button", { name: "Table users" });
    expect(screen.queryByText("Registered users")).not.toBeInTheDocument();
  });

  it("renders the comment when present", async () => {
    await WithComment.run();
    expect(screen.getByText("Registered users")).toBeInTheDocument();
  });

  it("applies the selected styling when selected", async () => {
    await Selected.run();
    expect(await screen.findByRole("button", { name: "Table users" })).toHaveClass("border-accent");
  });

  it("does not render a column list when there are no columns", async () => {
    await Default.run();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("renders each column's name when present", async () => {
    await WithColumns.run();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
  });
});
