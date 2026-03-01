import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Shell } from "./Shell";

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

describe("Shell", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStore());
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockInvoke.mockResolvedValue(undefined);
    mockListen.mockResolvedValue(() => undefined);
  });
  it("renders the application shell", () => {
    render(<Shell />);
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("renders the app header", () => {
    render(<Shell />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("renders the main content area", () => {
    render(<Shell />);
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
  });

  it("applies brand background colour to the shell", () => {
    render(<Shell />);
    const shell = screen.getByTestId("shell");
    expect(shell).toHaveStyle({ backgroundColor: "var(--bg)" });
  });

  it("renders the theme toggle button in the header", () => {
    render(<Shell />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("renders the ChatView as the primary content", () => {
    render(<Shell />);
    expect(screen.getByTestId("chat-view")).toBeInTheDocument();
  });

  it("renders the conversation sidebar in main content", () => {
    render(<Shell />);
    expect(screen.getByTestId("conversation-sidebar")).toBeInTheDocument();
  });

  it("renders the message input in main content", () => {
    render(<Shell />);
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });
});
