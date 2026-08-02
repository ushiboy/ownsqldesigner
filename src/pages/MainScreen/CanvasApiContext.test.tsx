import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { CanvasApiProvider, useCanvasApiRef } from "./CanvasApiContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <CanvasApiProvider>{children}</CanvasApiProvider>
);

function deselectAllTables() {}
function autoAlignTables() {}

describe("CanvasApiContext", () => {
  it("starts with no API registered", () => {
    const { result } = renderHook(() => useCanvasApiRef(), { wrapper });

    expect(result.current.current).toBeNull();
  });

  it("returns the same ref object across renders", () => {
    const { result, rerender } = renderHook(() => useCanvasApiRef(), { wrapper });
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("exposes whatever a caller registers into the ref", () => {
    const { result } = renderHook(() => useCanvasApiRef(), { wrapper });

    result.current.current = { deselectAllTables, autoAlignTables };

    expect(result.current.current).toEqual({ deselectAllTables, autoAlignTables });
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useCanvasApiRef())).toThrow(
      "useCanvasApiRef must be used within a CanvasApiProvider",
    );
  });
});
