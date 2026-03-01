import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useClaudeStream } from "./useClaudeStream";
import type { TokenPayload, CompletePayload, ErrorPayload } from "../lib/sidecar";

const mockInvoke = vi.mocked(invoke);
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

describe("useClaudeStream", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("initialises with empty tokens, null response, not streaming, and null error", () => {
    const { result } = renderHook(() => useClaudeStream());
    expect(result.current.tokens).toEqual([]);
    expect(result.current.response).toBeNull();
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("calls sidecar_send_message with message and a requestId when sendMessage is invoked", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await result.current.sendMessage("Hello Claude");
    });

    const callArgs = mockInvoke.mock.calls[0];
    expect(callArgs[0]).toBe("sidecar_send_message");
    const payload = callArgs[1] as { message: string; requestId: string };
    expect(payload.message).toBe("Hello Claude");
    expect(typeof payload.requestId).toBe("string");
    expect(payload.requestId.length).toBeGreaterThan(0);
  });

  it("sets streaming to true when sendMessage is called", async () => {
    let resolveInvoke!: () => void;
    mockInvoke.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveInvoke = resolve;
      }),
    );

    const { result } = renderHook(() => useClaudeStream());

    act(() => {
      void result.current.sendMessage("Hello");
    });

    expect(result.current.streaming).toBe(true);

    await act(async () => {
      resolveInvoke();
    });
  });

  it("accumulates tokens from sidecar://token events, ignoring other requestIds", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const listeners = setupListeners();

    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    const requestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId, token: "Hello" } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId, token: " world" } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId: "different-id", token: "ignored" } satisfies TokenPayload,
      });
    });

    expect(result.current.tokens).toEqual(["Hello", " world"]);
  });

  it("sets response and clears streaming on complete event", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const listeners = setupListeners();

    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    const requestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://complete"]({
        payload: {
          requestId,
          fullText: "Hello world",
        } satisfies CompletePayload,
      });
    });

    expect(result.current.response).toBe("Hello world");
    expect(result.current.streaming).toBe(false);
  });

  it("sets error state on sidecar://error event", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const listeners = setupListeners();

    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    const requestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://error"]({
        payload: {
          requestId,
          message: "Claude API error",
        } satisfies ErrorPayload,
      });
    });

    expect(result.current.error).toBe("Claude API error");
    expect(result.current.streaming).toBe(false);
  });

  it("resets tokens and response when a new message is sent", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const listeners = setupListeners();

    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.sendMessage("First");
    });

    const firstRequestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://complete"]({
        payload: {
          requestId: firstRequestId,
          fullText: "First response",
        } satisfies CompletePayload,
      });
    });

    await act(async () => {
      await result.current.sendMessage("Second");
    });

    expect(result.current.tokens).toEqual([]);
    expect(result.current.response).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets error when sidecar_send_message invoke fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("sidecar not ready"));
    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.error).toBe("sidecar not ready");
    expect(result.current.streaming).toBe(false);
  });

  it("listens for sidecar://token, sidecar://complete, sidecar://error on mount and unlistens on unmount", async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    const unlisten3 = vi.fn();
    const unlisteners = [unlisten1, unlisten2, unlisten3];
    let callCount = 0;
    mockListen.mockImplementation(async () => {
      return unlisteners[callCount++] ?? (() => undefined);
    });

    const { unmount } = renderHook(() => useClaudeStream());

    await act(async () => {
      await Promise.resolve();
    });

    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://token");
    expect(channels).toContain("sidecar://complete");
    expect(channels).toContain("sidecar://error");

    unmount();

    expect(unlisten1).toHaveBeenCalled();
    expect(unlisten2).toHaveBeenCalled();
    expect(unlisten3).toHaveBeenCalled();
  });

  it("calls sidecar_cancel when cancel is invoked", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const { result } = renderHook(() => useClaudeStream());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    mockInvoke.mockReset();
    mockInvoke.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.cancel();
    });

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_cancel", expect.objectContaining({}));
  });
});
