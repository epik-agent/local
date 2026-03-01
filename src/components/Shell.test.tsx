import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Shell } from "./Shell";

// jsdom does not implement scrollIntoView — provide a no-op stub.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

function setupReadyChecks(): void {
  mockInvoke.mockImplementation(async (cmd: string) => {
    if (cmd === "check_gh_installed") return true;
    if (cmd === "check_gh_auth") return true;
    if (cmd === "check_network") return true;
    return undefined;
  });
}

describe("Shell", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("epik.setup.complete", "true");
    mockInvoke.mockReset();
    mockListen.mockReset();
    setupReadyChecks();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("renders the application shell with main layout elements", async () => {
    render(<Shell />);
    await screen.findByTestId("chat-view");
    expect(screen.getByTestId("shell")).toBeInTheDocument();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("main-content")).toBeInTheDocument();
    expect(screen.getByTestId("wave-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("build-stream-panel")).toBeInTheDocument();
  });

  it("applies brand background colour to the shell", async () => {
    await act(async () => {
      render(<Shell />);
    });
    expect(screen.getByTestId("shell")).toHaveStyle({ backgroundColor: "var(--bg)" });
  });

  it("shows the setup wizard when setup is not yet complete", async () => {
    localStorage.clear();
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

  it("calls sidecar_start when setup is ready", async () => {
    render(<Shell />);
    await screen.findByTestId("chat-view");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("sidecar_start");
    });
  });

  it("disables the send button while sidecar is starting", async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "check_gh_installed") return true;
      if (cmd === "check_gh_auth") return true;
      if (cmd === "check_network") return true;
      if (cmd === "sidecar_start") return new Promise(() => undefined);
      return undefined;
    });

    render(<Shell />);
    await screen.findByTestId("chat-view");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("new-conversation-button"));
    await user.type(screen.getByTestId("message-input"), "hello");

    await waitFor(() => {
      expect(screen.getByTestId("send-button")).toBeDisabled();
    });
  });
});
