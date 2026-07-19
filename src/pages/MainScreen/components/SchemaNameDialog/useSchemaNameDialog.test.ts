import { act, fireEvent, renderHook } from "@testing-library/react";
import { useSchemaNameDialog } from "./useSchemaNameDialog";

describe("useSchemaNameDialog", () => {
  it("starts with an empty name", () => {
    const { result } = renderHook(() => useSchemaNameDialog({ onCancel: () => {} }));

    expect(result.current.name).toBe("");
    expect(result.current.trimmedName).toBe("");
  });

  it("trims the name for trimmedName while keeping the raw name untouched", () => {
    const { result } = renderHook(() => useSchemaNameDialog({ onCancel: () => {} }));

    act(() => {
      result.current.setName("  Blog Schema  ");
    });

    expect(result.current.name).toBe("  Blog Schema  ");
    expect(result.current.trimmedName).toBe("Blog Schema");
  });

  it("calls onCancel when Escape is pressed", () => {
    const onCancel = vi.fn<() => void>();
    renderHook(() => useSchemaNameDialog({ onCancel }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
