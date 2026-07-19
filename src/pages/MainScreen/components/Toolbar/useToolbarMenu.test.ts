import { act, fireEvent, renderHook } from "@testing-library/react";
import { useToolbarMenu } from "./useToolbarMenu";

describe("useToolbarMenu", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useToolbarMenu());

    expect(result.current.isOpen).toBe(false);
  });

  it("toggles open and closed", () => {
    const { result } = renderHook(() => useToolbarMenu());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("closes on a pointer press outside the wrapper", () => {
    const { result } = renderHook(() => useToolbarMenu());
    const wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
    result.current.wrapperRef.current = wrapper;

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      fireEvent.pointerDown(document.body);
    });
    expect(result.current.isOpen).toBe(false);

    document.body.removeChild(wrapper);
  });

  it("does not close on a pointer press inside the wrapper", () => {
    const { result } = renderHook(() => useToolbarMenu());
    const wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
    result.current.wrapperRef.current = wrapper;

    act(() => {
      result.current.toggle();
    });

    act(() => {
      fireEvent.pointerDown(wrapper);
    });
    expect(result.current.isOpen).toBe(true);

    document.body.removeChild(wrapper);
  });

  it("closes via close()", () => {
    const { result } = renderHook(() => useToolbarMenu());

    act(() => {
      result.current.toggle();
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
