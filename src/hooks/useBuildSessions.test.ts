import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useBuildSessions, MAX_CONCURRENT_BUILDS } from "./useBuildSessions";

const mockListen = vi.mocked(listen);
const mockInvoke = vi.mocked(invoke);

type BuildStatusPayload = { sessionId: string; status: string };
type ListenerFn = (event: { payload: BuildStatusPayload }) => void;
type ListenerMap = Partial<Record<string, ListenerFn>>;

async function renderWithStatusListener(): Promise<{
  result: ReturnType<typeof renderHook<ReturnType<typeof useBuildSessions>, unknown>>["result"];
  listeners: ListenerMap;
  unmount: () => void;
}> {
  const listeners: ListenerMap = {};
  mockListen.mockImplementation(async (channel, cb) => {
    listeners[channel as string] = cb as ListenerFn;
    return () => undefined;
  });
  const { result, unmount } = renderHook(() => useBuildSessions());
  await act(async () => {
    await Promise.resolve();
  });
  return { result, listeners, unmount };
}

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

  it("subscribes to sidecar://build/status events on mount and unlistens on unmount", async () => {
    const unlisten = vi.fn();
    mockListen.mockResolvedValue(unlisten);

    const { unmount } = renderHook(() => useBuildSessions());
    await act(async () => {
      await Promise.resolve();
    });

    const channels = mockListen.mock.calls.map((c) => c[0]);
    expect(channels).toContain("sidecar://build/status");

    unmount();
    expect(unlisten).toHaveBeenCalled();
  });

  it("calls sidecar_start_build and adds a running session when startBuild is invoked", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    expect(mockInvoke).toHaveBeenCalledWith(
      "sidecar_start_build",
      expect.objectContaining({ repo: "api" }),
    );
    const session = result.current.sessions[sessionId];
    expect(session).toBeDefined();
    expect(session.status).toBe("running");
    expect(session.org).toBe("acme");
    expect(session.repo).toBe("api");
  });

  it("sets activeSessionId to the first started session only", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let firstId!: string;
    await act(async () => {
      firstId = await result.current.startBuild("acme", "api");
    });
    expect(result.current.activeSessionId).toBe(firstId);

    await act(async () => {
      await result.current.startBuild("acme", "dashboard");
    });
    expect(result.current.activeSessionId).toBe(firstId);
  });

  it("rejects startBuild when MAX_CONCURRENT_BUILDS is reached", async () => {
    const { result } = renderHook(() => useBuildSessions());

    for (let i = 0; i < MAX_CONCURRENT_BUILDS; i++) {
      await act(async () => {
        await result.current.startBuild("acme", `repo-${String(i)}`);
      });
    }

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

  it("calls sidecar_stop_build and marks session as cancelled when stopBuild is invoked", async () => {
    const { result } = renderHook(() => useBuildSessions());
    let sessionId!: string;
    await act(async () => {
      sessionId = await result.current.startBuild("acme", "api");
    });
    await act(async () => {
      await result.current.stopBuild(sessionId);
    });
    expect(mockInvoke).toHaveBeenCalledWith("sidecar_stop_build", { sessionId });
    const session = result.current.sessions[sessionId];
    expect(session.status).toBe("cancelled");
    expect(session.completedAt).toBeDefined();
  });

  it.each(["completed", "failed"] as const)(
    "updates session status to %s when build/status event arrives",
    async (status) => {
      const { result, listeners } = await renderWithStatusListener();

      let sessionId!: string;
      await act(async () => {
        sessionId = await result.current.startBuild("acme", "api");
      });

      act(() => {
        listeners["sidecar://build/status"]?.({ payload: { sessionId, status } });
      });

      expect(result.current.sessions[sessionId].status).toBe(status);
      if (status === "completed") {
        expect(result.current.sessions[sessionId].completedAt).toBeDefined();
      }
    },
  );

  it("ignores build/status events for unknown session IDs", async () => {
    const { result, listeners } = await renderWithStatusListener();

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
});
