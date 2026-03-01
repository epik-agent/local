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

describe("ChatView", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStore());
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockInvoke.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(() => undefined);
  });

  it("renders the chat container", () => {
    render(<ChatView />);
    expect(screen.getByTestId("chat-view")).toBeInTheDocument();
  });

  it("renders the message input area", () => {
    render(<ChatView />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<ChatView />);
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("renders a new conversation button", () => {
    render(<ChatView />);
    expect(screen.getByTestId("new-conversation-button")).toBeInTheDocument();
  });

  it("renders the conversation sidebar", () => {
    render(<ChatView />);
    expect(screen.getByTestId("conversation-sidebar")).toBeInTheDocument();
  });

  it("renders the message list area", () => {
    render(<ChatView />);
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

  it("sends the message when send button is clicked", async () => {
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
    });
  });

  it("clears the input after sending", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    await user.click(screen.getByTestId("send-button"));
    await waitFor(() => {
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

  it("send is disabled when input is empty", () => {
    render(<ChatView />);
    const sendBtn = screen.getByTestId("send-button");
    expect(sendBtn).toBeDisabled();
  });

  it("send is disabled when no conversation is active", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    const sendBtn = screen.getByTestId("send-button");
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when input has text and a conversation is active", async () => {
    const user = userEvent.setup();
    render(<ChatView />);
    await user.click(screen.getByTestId("new-conversation-button"));
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    const sendBtn = screen.getByTestId("send-button");
    expect(sendBtn).not.toBeDisabled();
  });

  it("pressing Enter sends the message (Shift+Enter adds newline)", async () => {
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
