import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useChat } from "./useChat";
import type { CompletePayload, TokenPayload } from "../lib/sidecar";

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

function makeStore(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      Reflect.deleteProperty(store, key);
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        Reflect.deleteProperty(store, key);
      }
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
}

describe("useChat", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStore());
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("initialises with null active conversation", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.activeConversation).toBeNull();
  });

  it("initialises with empty conversations list", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.conversations).toEqual([]);
  });

  it("initialises with streaming false", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.streaming).toBe(false);
  });

  it("starts a new conversation when newConversation is called", () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });
    expect(result.current.activeConversation).not.toBeNull();
    expect(result.current.conversations).toHaveLength(1);
  });

  it("sends a user message and adds it to the conversation", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });

    await act(async () => {
      await result.current.sendMessage("Hello Claude");
    });

    const msgs = result.current.activeConversation?.messages ?? [];
    expect(msgs.some((m) => m.role === "user" && m.content === "Hello Claude")).toBe(true);
  });

  it("adds an assistant placeholder while streaming", async () => {
    let resolveInvoke!: () => void;
    mockInvoke.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveInvoke = resolve;
      }),
    );

    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });

    act(() => {
      void result.current.sendMessage("Hi");
    });

    expect(result.current.streaming).toBe(true);
    const msgs = result.current.activeConversation?.messages ?? [];
    expect(msgs.some((m) => m.role === "assistant")).toBe(true);

    await act(async () => {
      resolveInvoke();
    });
  });

  it("updates the assistant message content as tokens arrive", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.newConversation();
    });

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    const requestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId, token: "Hello" } satisfies TokenPayload,
      });
    });
    act(() => {
      listeners["sidecar://token"]({
        payload: { requestId, token: " there" } satisfies TokenPayload,
      });
    });

    const msgs = result.current.activeConversation?.messages ?? [];
    const assistant = msgs.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("Hello there");
  });

  it("finalises assistant message content on complete event", async () => {
    mockInvoke.mockResolvedValue(undefined);

    const listeners: Record<string, (event: { payload: unknown }) => void> = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as (event: { payload: unknown }) => void;
      return () => undefined;
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.newConversation();
    });

    await act(async () => {
      await result.current.sendMessage("Hi");
    });

    const requestId = (mockInvoke.mock.calls[0][1] as { requestId: string }).requestId;

    act(() => {
      listeners["sidecar://complete"]({
        payload: { requestId, fullText: "Final response text" } satisfies CompletePayload,
      });
    });

    const msgs = result.current.activeConversation?.messages ?? [];
    const assistant = msgs.find((m) => m.role === "assistant");
    expect(assistant?.content).toBe("Final response text");
    expect(result.current.streaming).toBe(false);
  });

  it("updates the conversation title from the first user message", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });

    await act(async () => {
      await result.current.sendMessage("What can you build for me?");
    });

    expect(result.current.activeConversation?.title).toBe("What can you build for me?");
  });

  it("selects a different conversation", () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });
    act(() => {
      result.current.newConversation();
    });
    const firstId = result.current.conversations[1]?.id ?? "";
    act(() => {
      result.current.selectConversation(firstId);
    });
    expect(result.current.activeConversation?.id).toBe(firstId);
  });

  it("deletes a conversation", () => {
    const { result } = renderHook(() => useChat());
    act(() => {
      result.current.newConversation();
    });
    const convId = result.current.conversations[0]?.id ?? "";
    act(() => {
      result.current.deleteConversation(convId);
    });
    expect(result.current.conversations).toHaveLength(0);
  });
});
