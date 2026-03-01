import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useConversations } from "./useConversations";
import type { Conversation } from "../lib/conversation";

const STORAGE_KEY = "epik-conversations";

describe("useConversations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initialises with an empty conversations list and null active conversation", () => {
    const { result } = renderHook(() => useConversations());
    expect(result.current.conversations).toEqual([]);
    expect(result.current.activeConversation).toBeNull();
  });

  it("creates a new conversation and sets it as active", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0]).toMatchObject({
      title: "New conversation",
      messages: [],
    });
    const convId = result.current.conversations[0]?.id;
    expect(result.current.activeConversation?.id).toBe(convId);
  });

  it("creates multiple conversations", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    act(() => {
      result.current.createConversation();
    });
    expect(result.current.conversations).toHaveLength(2);
  });

  it("selects a conversation by id", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    act(() => {
      result.current.createConversation();
    });
    const firstId = result.current.conversations[0]?.id ?? "";
    act(() => {
      result.current.selectConversation(firstId);
    });
    expect(result.current.activeConversation?.id).toBe(firstId);
  });

  it("deletes a conversation by id and clears active when it is the active one", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    const convId = result.current.conversations[0]?.id ?? "";
    act(() => {
      result.current.deleteConversation(convId);
    });
    expect(result.current.conversations).toHaveLength(0);
    expect(result.current.activeConversation).toBeNull();
  });

  it("keeps active conversation when a different one is deleted", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    act(() => {
      result.current.createConversation();
    });
    const firstId = result.current.conversations[0]?.id ?? "";
    const secondId = result.current.conversations[1]?.id ?? "";
    act(() => {
      result.current.selectConversation(secondId);
    });
    act(() => {
      result.current.deleteConversation(firstId);
    });
    expect(result.current.activeConversation?.id).toBe(secondId);
    expect(result.current.conversations).toHaveLength(1);
  });

  it("persists conversations to localStorage and restores on mount", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "[]") as Conversation[];
    expect(parsed).toHaveLength(1);

    // Restore from localStorage
    const existing: Conversation[] = [
      {
        id: "abc-123",
        title: "Previous chat",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    const { result: result2 } = renderHook(() => useConversations());
    expect(result2.current.conversations).toHaveLength(1);
    expect(result2.current.conversations[0]?.id).toBe("abc-123");
  });

  it("updates a conversation's messages", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    const convId = result.current.conversations[0]?.id ?? "";
    const msg = {
      id: "msg-1",
      role: "user" as const,
      content: "Hello",
      timestamp: new Date().toISOString(),
    };
    act(() => {
      result.current.updateConversation(convId, [msg]);
    });
    const updated = result.current.conversations.find((c) => c.id === convId);
    expect(updated?.messages).toHaveLength(1);
    expect(updated?.messages[0]?.content).toBe("Hello");
  });

  it("updates the conversation title", () => {
    const { result } = renderHook(() => useConversations());
    act(() => {
      result.current.createConversation();
    });
    const convId = result.current.conversations[0]?.id ?? "";
    act(() => {
      result.current.updateConversationTitle(convId, "My new title");
    });
    const updated = result.current.conversations.find((c) => c.id === convId);
    expect(updated?.title).toBe("My new title");
  });
});
