import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { useBuildStream } from "./useBuildStream";
import type { TokenPayload, CompletePayload } from "../lib/sidecar";

const mockListen = vi.mocked(listen);

type ListenerMap = Record<string, (event: { payload: unknown }) => void>;

function setupListeners(): ListenerMap {
  const listeners: ListenerMap = {};
  mockListen.mockImplementation(async (channel, cb) => {
    listeners[channel as string] = cb as (event: { payload: unknown }) => void;
    return () => undefined;
  });
  return listeners;
}

describe("useBuildStream", () => {
  beforeEach(() => {
    mockListen.mockReset();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("initialises with empty lines and isActive false", () => {
    const { result } = renderHook(() => useBuildStream());
    expect(result.current.lines).toEqual([]);
    expect(result.current.isActive).toBe(false);
  });

  it("listens for sidecar://token and sidecar://complete events on mount", async () => {
    renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });
    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://token");
    expect(channels).toContain("sidecar://complete");
  });

  it("accumulates token events as lines and sets isActive true", async () => {
    const listeners = setupListeners();

    const { result } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "Hello " } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "world" } satisfies TokenPayload,
      });
    });

    expect(result.current.lines).toEqual(["Hello ", "world"]);
    expect(result.current.isActive).toBe(true);
  });

  it("sets isActive to false when a complete event arrives", async () => {
    const listeners = setupListeners();

    const { result } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "data" } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://complete"]({
        payload: { requestId: "req-1", fullText: "data" } satisfies CompletePayload,
      });
    });

    expect(result.current.isActive).toBe(false);
  });

  it("resets lines on a new request (new requestId)", async () => {
    const listeners = setupListeners();

    const { result } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "first line" } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-2", token: "second build" } satisfies TokenPayload,
      });
    });

    expect(result.current.lines).toEqual(["second build"]);
  });

  it("calls unlisten functions on unmount", async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    let callCount = 0;
    const unlisteners = [unlisten1, unlisten2];
    mockListen.mockImplementation(async () => {
      return unlisteners[callCount++] ?? (() => undefined);
    });

    const { unmount } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    expect(unlisten1).toHaveBeenCalled();
    expect(unlisten2).toHaveBeenCalled();
  });

  it("uses session-scoped channels and not global channels when sessionId is provided", async () => {
    renderHook(() => useBuildStream("session-abc"));
    await act(async () => {
      await Promise.resolve();
    });
    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://token/session-abc");
    expect(channels).toContain("sidecar://complete/session-abc");
    expect(channels).not.toContain("sidecar://token");
    expect(channels).not.toContain("sidecar://complete");
  });

  it("accumulates tokens from session-scoped channel", async () => {
    const listeners = setupListeners();

    const { result } = renderHook(() => useBuildStream("session-xyz"));
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      listeners["sidecar://token/session-xyz"]({
        payload: { requestId: "req-1", token: "build output" } satisfies TokenPayload,
      });
    });

    expect(result.current.lines).toEqual(["build output"]);
    expect(result.current.isActive).toBe(true);
  });

  it("re-subscribes to new channels when sessionId changes", async () => {
    const { rerender } = renderHook(({ sid }: { sid?: string }) => useBuildStream(sid), {
      initialProps: { sid: "session-a" },
    });
    await act(async () => {
      await Promise.resolve();
    });
    mockListen.mockClear();

    rerender({ sid: "session-b" });
    await act(async () => {
      await Promise.resolve();
    });

    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://token/session-b");
    expect(channels).toContain("sidecar://complete/session-b");
  });
});
