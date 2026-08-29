import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fn } from "storybook/test";
import { composeStories } from "@storybook/react-vite";
import { saveAs } from "file-saver";
import { mockClipboard, mockObjectUrl } from "../../../../test/domMocks";
import * as stories from "./ExportMermaidDialog.stories";

vi.mock("file-saver", () => ({
  saveAs: vi.fn<(data: Blob | string, filename?: string) => void>(),
}));

const renderMermaid = vi.fn<(id: string, code: string) => Promise<{ svg: string }>>();

vi.mock("mermaid", () => ({
  default: { render: (id: string, code: string) => renderMermaid(id, code) },
}));

const { Open, Empty } = composeStories(stories);

const SAMPLE_CODE =
  'erDiagram\n  users {\n    INTEGER id PK\n    TEXT email\n  }\n  posts {\n    INTEGER user_id FK\n  }\n  users ||--o{ posts : "user_id"';

describe("ExportMermaidDialog", () => {
  beforeEach(() => {
    vi.mocked(saveAs).mockClear();
    renderMermaid.mockReset();
  });

  it("shows the generated Mermaid code in the code tab by default", () => {
    render(<Open />);
    expect(screen.getByRole("dialog", { name: "Export Mermaid" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Code" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Generated Mermaid code")).toHaveValue(SAMPLE_CODE);
  });

  it("copies the code to the clipboard and shows confirmation", async () => {
    const writeText = mockClipboard();
    render(<Open />);

    await userEvent.click(screen.getByRole("button", { name: "Copy to clipboard" }));

    expect(writeText).toHaveBeenCalledExactlyOnceWith(SAMPLE_CODE);
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("downloads the code as a .mmd file named after the schema", async () => {
    render(<Open />);

    await userEvent.click(screen.getByRole("button", { name: "Download .mmd" }));

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog Schema.mmd");
    const [blob] = vi.mocked(saveAs).mock.calls[0] ?? [];
    await expect((blob as Blob).text()).resolves.toBe(SAMPLE_CODE);
  });

  it("sanitizes filesystem-unsafe characters in the schema name for the downloaded filename", async () => {
    render(<Open schemaName="Blog/Schema:2026" />);

    await userEvent.click(screen.getByRole("button", { name: "Download .mmd" }));

    expect(saveAs).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), "Blog_Schema_2026.mmd");
  });

  it("shows a message and disables copy and download when there is nothing to export", () => {
    mockClipboard();
    render(<Empty />);
    expect(screen.getByText("No tables to export.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Generated Mermaid code")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Download .mmd" })).toBeDisabled();
  });

  it("renders the diagram as an image on the preview tab", async () => {
    mockObjectUrl();
    renderMermaid.mockResolvedValue({ svg: "<svg>diagram</svg>" });
    render(<Open />);

    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByLabelText("Generated Mermaid code")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Mermaid ER diagram preview" })).toHaveAttribute(
        "src",
        "blob:mock-url",
      ),
    );
    expect(renderMermaid).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^mermaid-preview-/),
      SAMPLE_CODE,
    );
  });

  it("shows an error message when mermaid fails to render the diagram", async () => {
    mockObjectUrl();
    renderMermaid.mockRejectedValue(new Error("invalid diagram"));
    render(<Open />);

    await userEvent.click(screen.getByRole("tab", { name: "Preview" }));

    await waitFor(() =>
      expect(screen.getByText("Couldn't render the preview.")).toBeInTheDocument(),
    );
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
