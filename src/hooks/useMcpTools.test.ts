import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { useMcpTools } from "./useMcpTools";
import type { ToolCallPayload, ToolResultPayload } from "../lib/mcp";

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

async function renderWithListeners(): Promise<{
  result: ReturnType<typeof renderHook<ReturnType<typeof useMcpTools>, unknown>>["result"];
  listeners: ListenerMap;
  unmount: () => void;
}> {
  const listeners = setupListeners();
  const { result, unmount } = renderHook(() => useMcpTools());
  await act(async () => {
    await Promise.resolve();
  });
  return { result, listeners, unmount };
}

describe("useMcpTools", () => {
  beforeEach(() => {
    mockListen.mockReset();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("initialises with an empty tool calls map", () => {
    const { result } = renderHook(() => useMcpTools());
    expect(result.current.toolCalls).toEqual({});
  });

  it("listens for sidecar://tool_call and sidecar://tool_result on mount and unlistens on unmount", async () => {
    const unlisten1 = vi.fn();
    const unlisten2 = vi.fn();
    const unlisteners = [unlisten1, unlisten2];
    let callCount = 0;
    mockListen.mockImplementation(async () => {
      return unlisteners[callCount++] ?? (() => undefined);
    });

    const { unmount } = renderHook(() => useMcpTools());

    await act(async () => {
      await Promise.resolve();
    });

    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://tool_call");
    expect(channels).toContain("sidecar://tool_result");

    unmount();
    expect(unlisten1).toHaveBeenCalled();
    expect(unlisten2).toHaveBeenCalled();
  });

  it("adds a pending tool call when sidecar://tool_call event fires", async () => {
    const { result, listeners } = await renderWithListeners();

    act(() => {
      listeners["sidecar://tool_call"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-1",
          name: "get_feature",
          args: { featureId: "feat-42" },
        } satisfies ToolCallPayload,
      });
    });

    expect(result.current.toolCalls["tc-1"]).toMatchObject({
      id: "tc-1",
      request_id: "req-1",
      name: "get_feature",
      args: { featureId: "feat-42" },
      status: "running",
      result: null,
    });
  });

  it("updates a tool call to success when sidecar://tool_result fires", async () => {
    const { result, listeners } = await renderWithListeners();

    act(() => {
      listeners["sidecar://tool_call"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-2",
          name: "plan_feature",
          args: {},
        } satisfies ToolCallPayload,
      });
    });
    act(() => {
      listeners["sidecar://tool_result"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-2",
          result: '{"issue": 42}',
          isError: false,
        } satisfies ToolResultPayload,
      });
    });

    expect(result.current.toolCalls["tc-2"]).toMatchObject({
      id: "tc-2",
      status: "success",
      result: '{"issue": 42}',
    });
  });

  it("updates a tool call to error when sidecar://tool_result fires with isError=true", async () => {
    const { result, listeners } = await renderWithListeners();

    act(() => {
      listeners["sidecar://tool_call"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-3",
          name: "get_wave_plan",
          args: {},
        } satisfies ToolCallPayload,
      });
    });
    act(() => {
      listeners["sidecar://tool_result"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-3",
          result: "Not found",
          isError: true,
        } satisfies ToolResultPayload,
      });
    });

    expect(result.current.toolCalls["tc-3"]).toMatchObject({
      id: "tc-3",
      status: "error",
      result: "Not found",
    });
  });

  it("clears all tool calls when clearToolCalls is called", async () => {
    const { result, listeners } = await renderWithListeners();

    act(() => {
      listeners["sidecar://tool_call"]({
        payload: {
          requestId: "req-1",
          toolCallId: "tc-4",
          name: "get_feature",
          args: {},
        } satisfies ToolCallPayload,
      });
    });

    expect(Object.keys(result.current.toolCalls)).toHaveLength(1);

    act(() => {
      result.current.clearToolCalls();
    });

    expect(result.current.toolCalls).toEqual({});
  });
});
