import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import { saveAs } from "file-saver";
import * as stories from "./ExportSqlDialog.stories";

vi.mock("file-saver", () => ({
  saveAs: vi.fn<(data: Blob | string, filename?: string) => void>(),
}));

const { Open, Empty, WithWarning } = composeStories(stories);

// jsdom does not implement the Clipboard API.
function mockClipboard() {
  const writeText = fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}

describe("ExportSqlDialog", () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
  });

  it("shows the generated DDL", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "Export SQL" })).toBeInTheDocument();
    expect(screen.getByLabelText("Generated SQL")).toHaveValue(
      "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n  email TEXT NOT NULL\n);",
    );
  });

  it("copies the DDL to the clipboard and shows confirmation", async () => {
    const writeText = mockClipboard();
    render(<Open />);

    await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n  email TEXT NOT NULL\n);",
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("does not show a primary-key warning when every table has one", () => {
    render(<Open />);
    expect(screen.queryByText("Tables with no primary key:")).not.toBeInTheDocument();
  });

  it("shows tables missing a primary key as a warning, without disabling copy or download", () => {
    render(<WithWarning />);
    expect(screen.getByText("Tables with no primary key:")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Download .sql" })).toBeEnabled();
  });

  it("shows a message and disables copy and download when there is nothing to export", () => {
    mockClipboard();
    render(<Empty />);
    expect(screen.getByText("No tables to export.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Generated SQL")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download .sql" })).toBeDisabled();
  });

  it("downloads the DDL as a .sql file named after the schema", async () => {
    render(<Open />);

    await userEvent.click(screen.getByRole("button", { name: "Download .sql" }));

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog Schema.sql");
    const [blob] = vi.mocked(saveAs).mock.calls[0] ?? [];
    await expect((blob as Blob).text()).resolves.toBe(
      "CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,\n  email TEXT NOT NULL\n);",
    );
  });

  it("sanitizes filesystem-unsafe characters in the schema name for the downloaded filename", async () => {
    render(<Open schemaName="Blog/Schema:2026" />);

    await userEvent.click(screen.getByRole("button", { name: "Download .sql" }));

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog_Schema_2026.sql");
  });

  it("calls onClose when the Close button is clicked", async () => {
    const onClose = fn();
    render(<Open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = fn();
    render(<Open onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
