import { useCallback, useEffect, useState } from "react";
import type { Conversation, Message } from "../lib/conversation";

const STORAGE_KEY = "epik-conversations";

/**
 * Load conversations from localStorage, returning an empty array on any failure.
 */
function loadConversations(): Conversation[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

/**
 * Persist the conversations array to localStorage.
 */
function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

/**
 * Generate a short unique id string.
 */
function generateId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Return type for the ``useConversations`` hook.
 */
export interface UseConversationsResult {
  /** All persisted conversations, newest-first. */
  conversations: Conversation[];
  /** The currently selected conversation, or ``null`` if none is selected. */
  activeConversation: Conversation | null;
  /** Create a blank conversation and make it active. */
  createConversation: () => void;
  /** Switch the active conversation to the one with the given id. */
  selectConversation: (id: string) => void;
  /** Remove a conversation by id. */
  deleteConversation: (id: string) => void;
  /** Replace the message list for a conversation and bump its ``updatedAt``. */
  updateConversation: (id: string, messages: Message[]) => void;
  /** Update the title of a conversation. */
  updateConversationTitle: (id: string, title: string) => void;
}

/**
 * Manages the list of conversations persisted in localStorage.
 *
 * On mount, the hook reads any previously saved conversations from
 * ``localStorage`` under the key ``"epik-conversations"``.  Every mutation
 * (create, update, delete) immediately writes the new state back to
 * ``localStorage``.
 */
export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Keep localStorage in sync whenever the conversations list changes.
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const createConversation = useCallback((): void => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: generateId(),
      title: "New conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
  }, []);

  const selectConversation = useCallback((id: string): void => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback((id: string): void => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const updateConversation = useCallback((id: string, messages: Message[]): void => {
    const updatedAt = new Date().toISOString();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, messages, updatedAt } : c)));
  }, []);

  const updateConversationTitle = useCallback((id: string, title: string): void => {
    const updatedAt = new Date().toISOString();
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title, updatedAt } : c)));
  }, []);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return {
    conversations,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversation,
    updateConversationTitle,
  };
}
