import { render, screen, act } from "@testing-library/react";
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
    const store = makeStore();
    // Pre-seed setup complete so Shell renders the normal layout in most tests.
    store.setItem("epik.setup.complete", "true");
    vi.stubGlobal("localStorage", store);
    mockInvoke.mockReset();
    mockListen.mockReset();
    // Default: setup checks all succeed so step resolves to "ready" quickly.
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "check_gh_installed") return true;
      if (cmd === "check_gh_auth") return true;
      if (cmd === "check_network") return true;
      return undefined;
    });
    mockListen.mockResolvedValue(() => undefined);
  });

  it("renders the application shell", async () => {
    await act(async () => {
      render(<Shell />);
    });
    expect(screen.getByTestId("shell")).toBeInTheDocument();
  });

  it("renders the app header", async () => {
    render(<Shell />);
    // Wait for setup to complete and main layout to appear
    await screen.findByTestId("app-header");
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("renders the main content area", async () => {
    render(<Shell />);
    await screen.findByTestId("main-content");
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
  });

  it("applies brand background colour to the shell", async () => {
    await act(async () => {
      render(<Shell />);
    });
    const shell = screen.getByTestId("shell");
    expect(shell).toHaveStyle({ backgroundColor: "var(--bg)" });
  });

  it("renders the theme toggle button in the header", async () => {
    render(<Shell />);
    await screen.findByTestId("theme-toggle");
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("renders the ChatView as the primary content", async () => {
    render(<Shell />);
    await screen.findByTestId("chat-view");
    expect(screen.getByTestId("chat-view")).toBeInTheDocument();
  });

  it("renders the conversation sidebar in main content", async () => {
    render(<Shell />);
    await screen.findByTestId("conversation-sidebar");
    expect(screen.getByTestId("conversation-sidebar")).toBeInTheDocument();
  });

  it("renders the message input in main content", async () => {
    render(<Shell />);
    await screen.findByTestId("message-input");
    expect(screen.getByTestId("message-input")).toBeInTheDocument();
  });

  it("renders the wave sidebar", async () => {
    render(<Shell />);
    await screen.findByTestId("wave-sidebar");
    expect(screen.getByTestId("wave-sidebar")).toBeInTheDocument();
  });

  it("renders the build stream panel", async () => {
    render(<Shell />);
    await screen.findByTestId("build-stream-panel");
    expect(screen.getByTestId("build-stream-panel")).toBeInTheDocument();
  });

  it("shows the setup wizard when setup is not yet complete", async () => {
    // Remove the setup complete flag.
    const store = makeStore();
    vi.stubGlobal("localStorage", store);

    render(<Shell />);
    await screen.findByTestId("setup-wizard");
    expect(screen.getByTestId("setup-wizard")).toBeInTheDocument();
  });

  it("does not show the network banner when online", async () => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => true });
    await act(async () => {
      render(<Shell />);
    });
    expect(screen.queryByTestId("network-banner")).toBeNull();
  });
});
