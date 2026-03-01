import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { useBuildStream } from "./useBuildStream";
import type { TokenPayload, CompletePayload } from "../lib/sidecar";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(listen);

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

  it("listens for sidecar://token events on mount", async () => {
    renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });
    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://token");
  });

  it("listens for sidecar://complete events on mount", async () => {
    renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });
    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://complete");
  });

  it("accumulates token events as lines", async () => {
    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

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
  });

  it("sets isActive to true when a token arrives", async () => {
    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "data" } satisfies TokenPayload,
      });
    });

    expect(result.current.isActive).toBe(true);
  });

  it("sets isActive to false when a complete event arrives", async () => {
    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

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
        payload: {
          requestId: "req-1",
          fullText: "data",
        } satisfies CompletePayload,
      });
    });

    expect(result.current.isActive).toBe(false);
  });

  it("resets lines on a new request (new requestId)", async () => {
    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useBuildStream());
    await act(async () => {
      await Promise.resolve();
    });

    // First build
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-1", token: "first line" } satisfies TokenPayload,
      });
    });

    // New build (new requestId)
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "req-2", token: "second build" } satisfies TokenPayload,
      });
    });

    // Lines should be reset to only the new build's output
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
});
