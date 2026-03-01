import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageBubble } from "./MessageBubble";
import type { Message } from "../lib/conversation";

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "test-id",
    role: "user",
    content: "Hello",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={makeMessage({ content: "Hello world" })} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders with user role testid", () => {
    render(<MessageBubble message={makeMessage({ role: "user" })} />);
    expect(screen.getByTestId("message-user")).toBeInTheDocument();
  });

  it("renders with assistant role testid", () => {
    render(<MessageBubble message={makeMessage({ role: "assistant" })} />);
    expect(screen.getByTestId("message-assistant")).toBeInTheDocument();
  });

  it("user messages have distinct styling from assistant", () => {
    const { rerender } = render(<MessageBubble message={makeMessage({ role: "user" })} />);
    const userEl = screen.getByTestId("message-user");
    const userClass = userEl.className;

    rerender(<MessageBubble message={makeMessage({ role: "assistant" })} />);
    const assistantEl = screen.getByTestId("message-assistant");
    const assistantClass = assistantEl.className;

    expect(userClass).not.toBe(assistantClass);
  });

  it("renders markdown in assistant messages", () => {
    render(
      <MessageBubble message={makeMessage({ role: "assistant", content: "**bold text**" })} />,
    );
    expect(screen.getByText("bold text").tagName).toBe("STRONG");
  });

  it("renders plain text in user messages without markdown wrapping", () => {
    render(<MessageBubble message={makeMessage({ role: "user", content: "plain text" })} />);
    expect(screen.getByText("plain text")).toBeInTheDocument();
  });

  it("shows a streaming indicator when isStreaming is true", () => {
    render(<MessageBubble message={makeMessage({ role: "assistant", content: "" })} isStreaming />);
    expect(screen.getByTestId("streaming-indicator")).toBeInTheDocument();
  });

  it("does not show streaming indicator when isStreaming is false", () => {
    render(
      <MessageBubble
        message={makeMessage({ role: "assistant", content: "Done" })}
        isStreaming={false}
      />,
    );
    expect(screen.queryByTestId("streaming-indicator")).not.toBeInTheDocument();
  });
});
