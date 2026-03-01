import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation, Message } from "../lib/conversation";
import { useConversations } from "./useConversations";
import { useClaudeStream } from "./useClaudeStream";

/**
 * Generate a short unique id string.
 */
function generateId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Return type for the ``useChat`` hook.
 */
export interface UseChatResult {
  /** All persisted conversations. */
  conversations: Conversation[];
  /** The currently active conversation, or ``null`` if none selected. */
  activeConversation: Conversation | null;
  /** Whether a streaming Claude response is currently in flight. */
  streaming: boolean;
  /** Any error from the last stream request. */
  error: string | null;
  /** Create a blank conversation and make it active. */
  newConversation: () => void;
  /** Switch the active conversation to the one with the given id. */
  selectConversation: (id: string) => void;
  /** Remove a conversation by id. */
  deleteConversation: (id: string) => void;
  /** Send a user message in the active conversation, streaming Claude's reply. */
  sendMessage: (text: string) => Promise<void>;
}

/**
 * Combines conversation management with Claude streaming into a single hook.
 *
 * On each ``sendMessage`` call the hook:
 *   1. Appends the user message to the active conversation.
 *   2. Adds a streaming assistant placeholder message.
 *   3. Calls ``useClaudeStream.sendMessage`` with the full conversation history.
 *   4. Updates the placeholder content token-by-token as tokens arrive.
 *   5. Finalises the message content when the stream completes.
 */
export function useChat(): UseChatResult {
  const {
    conversations,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversation,
    updateConversationTitle,
  } = useConversations();

  const { tokens, response, streaming, error, sendMessage: streamSend } = useClaudeStream();

  // Track which assistant message id is currently being streamed into.
  const streamingAssistantIdRef = useRef<string | null>(null);
  // Track which conversation is active when streaming started.
  const streamingConvIdRef = useRef<string | null>(null);
  // Maintain a local copy of messages during streaming to avoid stale closure issues.
  const messagesRef = useRef<Message[]>([]);

  // Sync the streaming assistant message content as tokens accumulate.
  const [accumulatedTokens, setAccumulatedTokens] = useState<string>("");

  useEffect(() => {
    const assistantId = streamingAssistantIdRef.current;
    const convId = streamingConvIdRef.current;
    if (assistantId === null || convId === null) return;

    // Build the accumulated text from all tokens received so far.
    const text = tokens.join("");
    setAccumulatedTokens(text);

    const updated = messagesRef.current.map((m) =>
      m.id === assistantId ? { ...m, content: text } : m,
    );
    messagesRef.current = updated;
    updateConversation(convId, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  // When the stream completes, finalise the assistant message content.
  useEffect(() => {
    const assistantId = streamingAssistantIdRef.current;
    const convId = streamingConvIdRef.current;
    if (response === null || assistantId === null || convId === null) return;

    const updated = messagesRef.current.map((m) =>
      m.id === assistantId ? { ...m, content: response } : m,
    );
    messagesRef.current = updated;
    updateConversation(convId, updated);
    streamingAssistantIdRef.current = null;
    streamingConvIdRef.current = null;
    setAccumulatedTokens("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  // Suppress unused variable warning — accumulatedTokens is set for completeness.
  void accumulatedTokens;

  const newConversation = useCallback((): void => {
    createConversation();
  }, [createConversation]);

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (activeConversation === null) return;

      const now = new Date().toISOString();
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: now,
      };
      const assistantId = generateId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: now,
      };

      const existingMessages = activeConversation.messages;
      const updatedMessages = [...existingMessages, userMsg, assistantMsg];

      messagesRef.current = updatedMessages;
      streamingAssistantIdRef.current = assistantId;
      streamingConvIdRef.current = activeConversation.id;

      updateConversation(activeConversation.id, updatedMessages);

      // Set title from the first user message.
      if (existingMessages.length === 0) {
        const title = text.length > 60 ? text.slice(0, 60) + "…" : text;
        updateConversationTitle(activeConversation.id, title);
      }

      // Build conversation history (without the empty assistant placeholder).
      const history = [...existingMessages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await streamSend(text, history);
    },
    [activeConversation, updateConversation, updateConversationTitle, streamSend],
  );

  return {
    conversations,
    activeConversation,
    streaming,
    error,
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
  };
}
