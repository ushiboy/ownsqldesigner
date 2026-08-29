import { renderHook, waitFor } from "@testing-library/react";
import { mockObjectUrl } from "../../../test/domMocks";
import { useMermaidPreview } from "./useMermaidPreview";

const renderMermaid = vi.fn<(id: string, code: string) => Promise<{ svg: string }>>();

vi.mock("mermaid", () => ({
  default: { render: (id: string, code: string) => renderMermaid(id, code) },
}));

describe("useMermaidPreview", () => {
  beforeEach(() => {
    renderMermaid.mockReset();
  });

  it("starts in the loading state", () => {
    mockObjectUrl();
    renderMermaid.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMermaidPreview("erDiagram"));

    expect(result.current).toEqual({ status: "loading" });
  });

  it("renders the code via mermaid and exposes the SVG as an object URL", async () => {
    const { createObjectURL } = mockObjectUrl();
    renderMermaid.mockResolvedValue({ svg: "<svg>diagram</svg>" });

    const { result } = renderHook(() => useMermaidPreview("erDiagram\n  USERS {\n  }"));

    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", objectUrl: "blob:mock-url" }),
    );
    expect(renderMermaid).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^mermaid-preview-/),
      "erDiagram\n  USERS {\n  }",
    );
    const [blob] = createObjectURL.mock.calls[0] ?? [];
    await expect((blob as Blob).text()).resolves.toBe("<svg>diagram</svg>");
  });

  it("reports an error state when mermaid fails to render", async () => {
    mockObjectUrl();
    renderMermaid.mockRejectedValue(new Error("invalid diagram"));

    const { result } = renderHook(() => useMermaidPreview("not valid"));

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("revokes the previous object URL when the code changes", async () => {
    const { revokeObjectURL } = mockObjectUrl();
    renderMermaid.mockResolvedValue({ svg: "<svg>diagram</svg>" });
    const { result, rerender } = renderHook(({ code }) => useMermaidPreview(code), {
      initialProps: { code: "erDiagram\n  A {\n  }" },
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    rerender({ code: "erDiagram\n  B {\n  }" });

    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:mock-url"));
  });

  it("revokes the object URL on unmount", async () => {
    const { revokeObjectURL } = mockObjectUrl();
    renderMermaid.mockResolvedValue({ svg: "<svg>diagram</svg>" });
    const { result, unmount } = renderHook(() => useMermaidPreview("erDiagram\n  A {\n  }"));
    await waitFor(() => expect(result.current.status).toBe("success"));

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:mock-url");
  });
});
