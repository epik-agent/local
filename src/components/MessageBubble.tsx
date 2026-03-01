import ReactMarkdown from "react-markdown";
import type { Message } from "../lib/conversation";

/**
 * Props for the ``MessageBubble`` component.
 */
interface MessageBubbleProps {
  /** The message to display. */
  message: Message;
  /** When ``true``, show a streaming indicator (blinking cursor). */
  isStreaming?: boolean;
}

/**
 * Renders a single chat message bubble.
 *
 * User messages are right-aligned with the accent background.  Assistant
 * messages are left-aligned with the surface background and support full
 * Markdown rendering via ``react-markdown``.
 */
export function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps): React.ReactElement {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end" data-testid="message-user">
        <div
          className="max-w-[70%] rounded-2xl rounded-br-sm px-5 py-3 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-on-accent)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-testid="message-assistant">
      <div
        className="max-w-[75%] rounded-2xl rounded-bl-sm px-5 py-3 text-sm leading-relaxed"
        style={{ backgroundColor: "var(--bg-raised)", color: "var(--text)" }}
      >
        <div className="prose prose-sm max-w-none leading-relaxed" style={{ color: "var(--text)" }}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {isStreaming && (
          <span
            className="inline-block h-4 w-0.5 animate-pulse"
            style={{ backgroundColor: "var(--accent)" }}
            data-testid="streaming-indicator"
            aria-label="Streaming"
          />
        )}
      </div>
    </div>
  );
}
