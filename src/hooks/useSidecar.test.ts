import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useSidecar } from "./useSidecar";
import type { StatusPayload } from "../lib/sidecar";

const mockInvoke = vi.mocked(invoke);
const mockListen = vi.mocked(listen);

describe("useSidecar", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockListen.mockReset();
    mockListen.mockResolvedValue(() => undefined);
  });

  it("initialises with stopped status and null error", () => {
    const { result } = renderHook(() => useSidecar());
    expect(result.current.status).toBe("stopped");
    expect(result.current.error).toBeNull();
  });

  it("calls sidecar_start command when start is invoked", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSidecar());

    await act(async () => {
      await result.current.start();
    });

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_start");
  });

  it("sets status to starting when start is called", async () => {
    let resolveStart!: () => void;
    mockInvoke.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      }),
    );

    const { result } = renderHook(() => useSidecar());

    act(() => {
      void result.current.start();
    });

    expect(result.current.status).toBe("starting");

    await act(async () => {
      resolveStart();
    });
  });

  it("calls sidecar_stop command and sets status to stopped", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSidecar());

    await act(async () => {
      await result.current.stop();
    });

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_stop");
    expect(result.current.status).toBe("stopped");
  });

  it("calls sidecar_restart command when restart is invoked", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useSidecar());

    await act(async () => {
      await result.current.restart();
    });

    expect(mockInvoke).toHaveBeenCalledWith("sidecar_restart");
  });

  it("sets error and status to error when start command fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("sidecar launch failed"));
    const { result } = renderHook(() => useSidecar());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("sidecar launch failed");
    expect(result.current.status).toBe("error");
  });

  it("updates status from sidecar://status events and unlistens on unmount", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const unlisten = vi.fn();

    let statusCallback!: (event: { payload: StatusPayload }) => void;
    mockListen.mockImplementation(async (channel, cb) => {
      if (channel === "sidecar://status") {
        statusCallback = cb as (event: { payload: StatusPayload }) => void;
      }
      return unlisten;
    });

    const { result, unmount } = renderHook(() => useSidecar());

    await act(async () => {
      await result.current.start();
    });

    expect(mockListen).toHaveBeenCalledWith("sidecar://status", expect.any(Function));

    act(() => {
      statusCallback({ payload: { status: "ready" } });
    });

    expect(result.current.status).toBe("ready");

    unmount();
    expect(unlisten).toHaveBeenCalled();
  });
});
