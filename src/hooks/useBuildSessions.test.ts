import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useBuildSessions, MAX_CONCURRENT_BUILDS } from "./useBuildSessions";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockListen = vi.mocked(listen);
const mockInvoke = vi.mocked(invoke);

type BuildStatusPayload = { sessionId: string; status: string };
type ListenerFn = (event: { payload: BuildStatusPayload }) => void;
type ListenerMap = Partial<Record<string, ListenerFn>>;

describe("useBuildSessions", () => {
  beforeEach(() => {
    mockListen.mockReset();
    mockInvoke.mockReset();
    mockListen.mockResolvedValue(() => undefined);
    mockInvoke.mockResolvedValue(undefined);
  });

  it("initialises with empty sessions and null activeSessionId", () => {
    const { result } = renderHook(() => useBuildSessions());
    expect(result.current.sessions).toEqual({});
    expect(result.current.activeSessionId).toBeNull();
  });

  it("subscribes to sidecar://build/status events on mount", async () => {
    renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });
    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://build/status");
  });

  it("calls sidecar_start_build when startBuild is invoked", async () => {
    const { result } = renderHook(() => useBuildSessions());
    await act(async () => {
      await result.current.startBuild("acme", "api");
    });
    expect(mockInvoke).toHaveBeenCalledWith(
      "sidecar_start_build",
      expect.objectContaining({ repo: "api" }),
    );
  });

  it("adds a running session to sessions state after startBuild", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    const session = result.current.sessions[sessionId];
    expect(session).toBeDefined();
    expect(session.status).toBe("running");
    expect(session.org).toBe("acme");
    expect(session.repo).toBe("api");
  });

  it("sets activeSessionId to the first started session", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    expect(result.current.activeSessionId).toBe(sessionId);
  });

  it("does not change activeSessionId when a second session is started", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let firstId!: string;
    await act(async () => {
      firstId = await result.current.startBuild("acme", "api");
    });
    await act(async () => {
      await result.current.startBuild("acme", "dashboard");
    });
    expect(result.current.activeSessionId).toBe(firstId);
  });

  it("rejects startBuild when MAX_CONCURRENT_BUILDS is reached", async () => {
    const { result } = renderHook(() => useBuildSessions());

    // Start the maximum number of builds
    for (let i = 0; i < MAX_CONCURRENT_BUILDS; i++) {
      await act(async () => {
        await result.current.startBuild("acme", `repo-${String(i)}`);
      });
    }

    // The next one should throw
    await act(async () => {
      await expect(result.current.startBuild("acme", "one-too-many")).rejects.toThrow(
        /maximum concurrent builds/i,
      );
    });
  });

  it("selectSession changes the activeSessionId", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let firstId!: string;
    let secondId!: string;
    await act(async () => {
      firstId = await result.current.startBuild("acme", "api");
      secondId = await result.current.startBuild("acme", "dashboard");
    });
    act(() => {
      result.current.selectSession(secondId);
    });
    expect(result.current.activeSessionId).toBe(secondId);
    act(() => {
      result.current.selectSession(firstId);
    });
    expect(result.current.activeSessionId).toBe(firstId);
  });

  it("calls sidecar_stop_build when stopBuild is invoked", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    await act(async () => {
      await result.current.stopBuild(sessionId);
    });
    expect(mockInvoke).toHaveBeenCalledWith("sidecar_stop_build", { sessionId });
  });

  it("marks a session as cancelled after stopBuild", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    await act(async () => {
      await result.current.stopBuild(sessionId);
    });
    const session = result.current.sessions[sessionId];
    expect(session.status).toBe("cancelled");
    expect(session.completedAt).toBeDefined();
  });

  it("updates session status to completed when build/status event arrives", async () => {
    const listeners: ListenerMap = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as ListenerFn;
      return () => undefined;
    });

    const { result } = renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });

    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });

    act(() => {
      listeners["sidecar://build/status"]?.({ payload: { sessionId, status: "completed" } });
    });

    const session = result.current.sessions[sessionId];
    expect(session.status).toBe("completed");
    expect(session.completedAt).toBeDefined();
  });

  it("updates session status to failed when build/status event arrives", async () => {
    const listeners: ListenerMap = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as ListenerFn;
      return () => undefined;
    });

    const { result } = renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });

    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });

    act(() => {
      listeners["sidecar://build/status"]?.({ payload: { sessionId, status: "failed" } });
    });

    expect(result.current.sessions[sessionId].status).toBe("failed");
  });

  it("ignores build/status events for unknown session IDs", async () => {
    const listeners: ListenerMap = {};
    mockListen.mockImplementation(async (channel, cb) => {
      listeners[channel as string] = cb as ListenerFn;
      return () => undefined;
    });

    const { result } = renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });

    // Fire an event for a session that doesn't exist — should not throw
    act(() => {
      listeners["sidecar://build/status"]?.({
        payload: { sessionId: "ghost-session", status: "completed" },
      });
    });

    expect(result.current.sessions).toEqual({});
  });

  it("rolls back session state when sidecar_start_build invocation fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("sidecar spawn failed"));

    const { result } = renderHook(() => useBuildSessions());

    await act(async () => {
      await expect(result.current.startBuild("acme", "api")).rejects.toThrow(
        "sidecar spawn failed",
      );
    });

    expect(result.current.sessions).toEqual({});
  });

  it("calls unlisten on unmount", async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const { unmount } = renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });

    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});
