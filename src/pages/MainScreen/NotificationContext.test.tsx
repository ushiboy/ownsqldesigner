import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { NotificationProvider, useNotification } from "./NotificationContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe("NotificationContext", () => {
  it("starts without a notification", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    expect(result.current.notification).toBeNull();
  });

  it("sets and dismisses a notification", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.notify("Something went wrong");
    });
    expect(result.current.notification).toBe("Something went wrong");

    act(() => {
      result.current.dismissNotification();
    });
    expect(result.current.notification).toBeNull();
  });

  it("replaces an existing notification with the latest message", () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.notify("First");
    });
    act(() => {
      result.current.notify("Second");
    });

    expect(result.current.notification).toBe("Second");
  });

  it("seeds the initial notification for stories and tests", () => {
    const { result } = renderHook(() => useNotification(), {
      wrapper: ({ children }) => (
        <NotificationProvider initialNotification="Seeded">{children}</NotificationProvider>
      ),
    });

    expect(result.current.notification).toBe("Seeded");
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useNotification())).toThrow(
      "useNotification must be used within a NotificationProvider",
    );
  });
});
