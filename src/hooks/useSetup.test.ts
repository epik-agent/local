import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useSetup } from "./useSetup";

const mockInvoke = vi.mocked(invoke);

const SETUP_KEY = "epik.setup.complete";

describe("useSetup", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    localStorage.clear();
  });

  function mockChecks({
    ghInstalled = true,
    ghAuthenticated = true,
    networkOnline = true,
  }: {
    ghInstalled?: boolean;
    ghAuthenticated?: boolean;
    networkOnline?: boolean;
  } = {}): void {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === "check_gh_installed") return ghInstalled;
      if (cmd === "check_gh_auth") return ghAuthenticated;
      if (cmd === "check_network") return networkOnline;
      return undefined;
    });
  }

  it("starts in the checking step", async () => {
    mockInvoke.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSetup());
    expect(result.current.step).toBe("checking");
  });

  it("moves to ready step when all checks pass and project is already selected", async () => {
    localStorage.setItem(SETUP_KEY, "true");
    mockChecks();
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("ready");
    });
  });

  it("moves to project_select when checks pass but no project selected", async () => {
    mockChecks();
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("project_select");
    });
  });

  it("moves to gh_missing step when gh is not installed", async () => {
    mockChecks({ ghInstalled: false });
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("gh_missing");
    });

    expect(result.current.status.ghInstalled).toBe(false);
  });

  it("moves to gh_unauth step when gh is installed but not authenticated", async () => {
    mockChecks({ ghInstalled: true, ghAuthenticated: false });
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("gh_unauth");
    });
  });

  it("returns status reflecting all check results", async () => {
    mockChecks({ ghInstalled: true, ghAuthenticated: true, networkOnline: true });
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).not.toBe("checking");
    });

    expect(result.current.status.ghInstalled).toBe(true);
    expect(result.current.status.ghAuthenticated).toBe(true);
    expect(result.current.status.networkOnline).toBe(true);
  });

  it("retry re-runs the checks and updates step", async () => {
    mockChecks({ ghInstalled: false });
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("gh_missing");
    });

    mockChecks({ ghInstalled: true, ghAuthenticated: true, networkOnline: true });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("project_select");
    });
  });

  it("persists setup complete flag to localStorage when completeSetup is called", async () => {
    mockChecks();
    const { result } = renderHook(() => useSetup());

    await waitFor(() => {
      expect(result.current.step).toBe("project_select");
    });

    act(() => {
      result.current.completeSetup();
    });

    expect(localStorage.getItem(SETUP_KEY)).toBe("true");
    expect(result.current.step).toBe("ready");
  });
});
