import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { composeStories } from "@storybook/react-vite";
import * as stories from "./DefaultColumnTemplatesEditor.stories";

const { Empty, WithColumns } = composeStories(stories);

describe("DefaultColumnTemplatesEditor", () => {
  it("shows the empty hint when the selected dialect has no templates", () => {
    render(<Empty />);

    expect(screen.getByText("No default columns configured for this dialect.")).toBeInTheDocument();
  });

  it("lists the configured templates for the default (SQLite) tab", () => {
    render(<WithColumns />);

    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("created_at")).toBeInTheDocument();
  });

  it("shows an empty list when switching to a dialect with no configured templates", async () => {
    const user = userEvent.setup();
    render(<WithColumns />);

    await user.click(screen.getByRole("tab", { name: "PostgreSQL" }));

    expect(screen.getByText("No default columns configured for this dialect.")).toBeInTheDocument();
  });

  it("adds a new column via the column dialog", async () => {
    const user = userEvent.setup();
    render(<Empty />);

    await user.click(screen.getByRole("button", { name: "Add Column" }));
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    await user.type(within(dialog).getByLabelText("Name"), "created_at");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("created_at")).toBeInTheDocument();
  });

  it("edits an existing column via the column dialog", async () => {
    const user = userEvent.setup();
    render(<WithColumns />);

    await user.click(screen.getByRole("button", { name: "Edit column id" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Column" });
    const nameInput = within(dialog).getByLabelText("Name");
    await user.clear(nameInput);
    await user.type(nameInput, "user_id");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(screen.getByText("user_id")).toBeInTheDocument();
    expect(screen.queryByText("id")).not.toBeInTheDocument();
  });

  it("removes a row when clicking its delete button", async () => {
    const user = userEvent.setup();
    render(<WithColumns />);

    await user.click(screen.getByRole("button", { name: "Delete column id" }));

    expect(screen.queryByText("id")).not.toBeInTheDocument();
    expect(screen.getByText("created_at")).toBeInTheDocument();
  });

  it("keeps each dialect's templates independent", async () => {
    const user = userEvent.setup();
    render(<WithColumns />);

    await user.click(screen.getByRole("tab", { name: "PostgreSQL" }));
    await user.click(screen.getByRole("button", { name: "Add Column" }));
    const dialog = screen.getByRole("dialog", { name: "Add Column" });
    await user.type(within(dialog).getByLabelText("Name"), "uuid_id");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("tab", { name: "SQLite" }));

    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.queryByText("uuid_id")).not.toBeInTheDocument();
  });

  it("disables the PRIMARY KEY checkbox when another row already owns it", async () => {
    const user = userEvent.setup();
    render(<WithColumns />);

    await user.click(screen.getByRole("button", { name: "Edit column created_at" }));
    const dialog = screen.getByRole("dialog", { name: "Edit Column" });

    expect(within(dialog).getByRole("checkbox", { name: "Primary Key" })).toBeDisabled();
  });

  it("disables move-up on the first row and move-down on the last row", () => {
    render(<WithColumns />);

    expect(screen.getByRole("button", { name: "Move id up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move id down" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Move created_at up" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Move created_at down" })).toBeDisabled();
  });
});
