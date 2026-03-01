import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useResizeHandle } from "../hooks/useResizeHandle";
import { MessageBubble } from "./MessageBubble";
import type { Conversation } from "../lib/conversation";
import type { SidecarStatus } from "../lib/sidecar";

interface ChatViewProps {
  sidecarStatus?: SidecarStatus;
  sidecarError?: string | null;
}

/**
 * The primary Chat view component.
 *
 * Renders a three-panel layout:
 * - A narrow collapsible sidebar listing all past conversations.
 * - A scrolling message list that auto-scrolls as tokens stream in.
 * - A bottom input bar with a textarea and a send button.
 *
 * Messages are persisted to ``localStorage`` via ``useChat``, so the
 * conversation history survives app restarts.
 */
export function ChatView({
  sidecarStatus = "ready",
  sidecarError = null,
}: ChatViewProps = {}): React.ReactElement {
  const {
    conversations,
    activeConversation,
    streaming,
    error,
    newConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
  } = useChat();

  const [inputText, setInputText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { size: sidebarWidth, isDragging: isSidebarDragging, onMouseDown: handleSidebarDragStart } = useResizeHandle({
    defaultSize: 240,
    minSize: 160,
    maxSize: 400,
    axis: "horizontal",
    direction: "positive",
  });

  // Auto-scroll to latest message whenever the active conversation messages update.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleSend = useCallback(async (): Promise<void> => {
    const text = inputText.trim();
    if (text === "" || activeConversation === null) return;
    setInputText("");
    await sendMessage(text);
  }, [inputText, activeConversation, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleDeleteConversation = useCallback(
    (e: React.MouseEvent, convId: string): void => {
      e.stopPropagation();
      deleteConversation(convId);
    },
    [deleteConversation],
  );

  const sidecarReady = sidecarStatus === "ready";
  const canSend = inputText.trim().length > 0 && activeConversation !== null && sidecarReady;
  const displayError = sidecarError ?? error;

  const messages = activeConversation?.messages ?? [];
  const lastMessage = messages.at(-1);
  const isLastMessageStreaming = streaming && lastMessage?.role === "assistant";

  return (
    <div className="flex h-full" data-testid="chat-view">
      {/* Conversation sidebar + resize handle */}
      <div
        className="flex shrink-0"
        style={{
          width: sidebarOpen ? `${sidebarWidth}px` : "48px",
          minWidth: sidebarOpen ? `${sidebarWidth}px` : "48px",
          transition: isSidebarDragging ? "none" : "width 0.2s ease, min-width 0.2s ease",
        }}
      >
      <aside
        className="flex flex-1 flex-col overflow-hidden"
        style={{
          backgroundColor: "var(--bg-bar)",
        }}
        data-testid="conversation-sidebar"
      >
        {/* Sidebar header */}
        <div
          className="flex items-center gap-2 border-b px-3 py-3.5"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={(): void => {
              setSidebarOpen((o) => !o);
            }}
            className="flex-shrink-0 rounded p-1.5 transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="3" width="14" height="1.5" rx="0.75" />
              <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" />
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" />
            </svg>
          </button>
          {sidebarOpen && (
            <button
              onClick={newConversation}
              className="flex flex-1 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--accent-muted)",
                color: "var(--accent)",
              }}
              data-testid="new-conversation-button"
              title="New conversation"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 1a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5H1.75a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 6 1Z" />
              </svg>
              New chat
            </button>
          )}
          {!sidebarOpen && (
            <button
              onClick={newConversation}
              className="sr-only"
              data-testid="new-conversation-button"
              aria-label="New conversation"
            >
              New
            </button>
          )}
        </div>

        {/* Conversation list */}
        {sidebarOpen && (
          <nav className="flex-1 overflow-y-auto py-2">
            {conversations.map((conv: Conversation) => (
              <div key={conv.id} className="group flex items-center gap-1 px-2 py-1">
                <button
                  onClick={(): void => {
                    selectConversation(conv.id);
                  }}
                  className="flex-1 truncate rounded-lg px-2.5 py-2 text-left text-sm transition-colors"
                  style={{
                    backgroundColor:
                      activeConversation?.id === conv.id ? "var(--bg-active)" : "transparent",
                    color:
                      activeConversation?.id === conv.id ? "var(--text)" : "var(--text-secondary)",
                  }}
                  title={conv.title}
                >
                  {conv.title}
                </button>
                <button
                  onClick={(e): void => {
                    handleDeleteConversation(e, conv.id);
                  }}
                  className="flex-shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: "var(--text-muted)" }}
                  aria-label={`Delete conversation: ${conv.title}`}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M9.78 3.28a.75.75 0 0 0-1.06-1.06L6 4.94 3.28 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.22 8.72a.75.75 0 1 0 1.06 1.06L6 7.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L7.06 6l2.72-2.72Z" />
                  </svg>
                </button>
              </div>
            ))}
          </nav>
        )}
      </aside>

      {/* Sidebar resize handle */}
      {sidebarOpen && (
        <div
          data-testid="sidebar-resize-handle"
          onMouseDown={handleSidebarDragStart}
          className="flex w-1 shrink-0 cursor-col-resize items-center justify-center transition-colors"
          style={{ backgroundColor: isSidebarDragging ? "var(--border-strong)" : "var(--border)" }}
          role="separator"
          aria-label="Resize conversation sidebar"
        />
      )}
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Message list */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ backgroundColor: "var(--bg)" }}
          data-testid="message-list"
        >
          {activeConversation === null && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Start a new conversation to begin chatting with Claude.
              </p>
              <button
                onClick={newConversation}
                className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-on-accent)",
                }}
              >
                New conversation
              </button>
            </div>
          )}

          {activeConversation !== null && messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                What would you like to build?
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => {
              const isThisMessageStreaming =
                isLastMessageStreaming && index === messages.length - 1;
              return (
                <MessageBubble key={msg.id} message={msg} isStreaming={isThisMessageStreaming} />
              );
            })}
          </div>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {displayError !== null && (
          <div
            className="border-t px-4 py-2 text-xs"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--color-error)",
            }}
            data-testid="error-banner"
          >
            {displayError}
          </div>
        )}

        {/* Input bar */}
        <div
          className="border-t px-5 py-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-end gap-3">
            <textarea
              value={inputText}
              onChange={(e): void => {
                setInputText(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                !sidecarReady
                  ? "Waiting for sidecar…"
                  : activeConversation === null
                    ? "Create a conversation to start chatting…"
                    : "Type a message… (Enter to send, Shift+Enter for newline)"
              }
              disabled={streaming || !sidecarReady}
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm leading-relaxed outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-input)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                fontFamily: "var(--brand-font-sans)",
                minHeight: "44px",
                maxHeight: "160px",
                overflowY: "auto",
              }}
              data-testid="message-input"
            />
            <button
              onClick={(): void => {
                void handleSend();
              }}
              disabled={!canSend || streaming}
              className="flex-shrink-0 rounded-xl px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40"
              style={{
                backgroundColor: canSend && !streaming ? "var(--accent)" : "var(--bg-raised)",
                color: canSend && !streaming ? "var(--accent-on-accent)" : "var(--text-muted)",
              }}
              data-testid="send-button"
              aria-label="Send message"
            >
              {streaming ? "…" : sidecarStatus === "starting" ? "Starting…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
