import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ChatView } from "./ChatView";

// jsdom does not implement scrollIntoView — provide a no-op stub.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

describe("ChatView", () => {
  beforeEach(() => {
    localStorage.clear();
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockInvoke.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(() => undefined);
  });

  it("renders the chat container with message input, send button, and conversation sidebar", () => {
    render(<ChatView />);
    expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
    expect(screen.getByTestId("new-conversation-button")).toBeInTheDocument();
    expect(screen.getByTestId("conversation-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("message-list")).toBeInTheDocument();
  });

  it("clicking new conversation creates a chat", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    await waitFor(() => {
      expect(screen.getByTestId("conversation-sidebar").textContent).toContain("New conversation");
    });
  });

  it("can type a message in the input", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello Claude");
    expect(input).toHaveValue("Hello Claude");
  });

  it("sends the message when send button is clicked and clears the input", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    await user.click(screen.getByTestId("send-button"));
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "sidecar_send_message",
        expect.objectContaining({ message: "Hello" }),
      );
      expect(input).toHaveValue("");
    });
  });

  it("shows the user message in the message list after sending", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "What can you build?");
    await user.click(screen.getByTestId("send-button"));
    await waitFor(() => {
      expect(screen.getByTestId("message-user")).toBeInTheDocument();
    });
  });

  it("send button is disabled when input is empty or no conversation is active", async () => {
    const user = userEvent.setup();
    render(<ChatView />);

    // No conversation, no text
    expect(screen.getByTestId("send-button")).toBeDisabled();

    // Text but no conversation
    await user.type(screen.getByRole("textbox"), "Hello");
    expect(screen.getByTestId("send-button")).toBeDisabled();
  });

  it("send button is enabled when input has text and a conversation is active", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    expect(screen.getByTestId("send-button")).not.toBeDisabled();
  });

  it("pressing Enter sends the message", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello{Enter}");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "sidecar_send_message",
        expect.objectContaining({ message: "Hello" }),
      );
    });
  });
});
