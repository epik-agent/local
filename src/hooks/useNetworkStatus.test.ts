import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useNetworkStatus } from "./useNetworkStatus";

describe("useNetworkStatus", () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, "onLine");

  function stubOnline(value: boolean): void {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => value,
    });
  }

  afterEach(() => {
    if (originalOnLine !== undefined) {
      Object.defineProperty(window.navigator, "onLine", originalOnLine);
    }
  });

  beforeEach(() => {
    stubOnline(true);
  });

  it("returns isOnline true when navigator.onLine is true", () => {
    stubOnline(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it("returns isOnline false when navigator.onLine is false", () => {
    stubOnline(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it("transitions to offline when the offline event fires", () => {
    stubOnline(true);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      stubOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it("transitions to online when the online event fires", () => {
    stubOnline(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      stubOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it("removes event listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useNetworkStatus());

    const onlineCallCount = addSpy.mock.calls.filter(([event]) => event === "online").length;
    const offlineCallCount = addSpy.mock.calls.filter(([event]) => event === "offline").length;

    unmount();

    const onlineRemoveCount = removeSpy.mock.calls.filter(([event]) => event === "online").length;
    const offlineRemoveCount = removeSpy.mock.calls.filter(([event]) => event === "offline").length;

    expect(onlineRemoveCount).toBeGreaterThanOrEqual(onlineCallCount);
    expect(offlineRemoveCount).toBeGreaterThanOrEqual(offlineCallCount);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
