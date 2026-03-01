import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWaveData } from "./useWaveData";
import type { Wave } from "../lib/build";

vi.mock("./useProjectScope", () => ({
  useProjectScope: vi.fn(),
}));

import { useProjectScope } from "./useProjectScope";
const mockUseProjectScope = vi.mocked(useProjectScope);

vi.mock("../lib/waveApi", () => ({
  fetchWaves: vi.fn(),
}));

import { fetchWaves } from "../lib/waveApi";
const mockFetchWaves = vi.mocked(fetchWaves);

const sampleWaves: Wave[] = [
  {
    number: 1,
    issues: [
      { number: 1, title: "Set up repo", status: "done", isActive: false },
      {
        number: 2,
        title: "Add CI",
        status: "in_progress",
        isActive: true,
        prNumber: 5,
        prUrl: "https://github.com/org/repo/pull/5",
        ciUrl: "https://github.com/org/repo/actions/runs/123",
      },
    ],
  },
  {
    number: 2,
    issues: [{ number: 3, title: "Add dashboard", status: "todo", isActive: false }],
  },
];

describe("useWaveData", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetchWaves.mockReset();
    mockUseProjectScope.mockReset();
    mockUseProjectScope.mockReturnValue({
      org: "epik-agent",
      repo: "local",
      scopeLabel: "epik-agent/local",
      setOrg: vi.fn(),
      setRepo: vi.fn(),
    });
    mockFetchWaves.mockResolvedValue(sampleWaves);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initialises with empty waves array", () => {
    mockFetchWaves.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useWaveData());
    expect(result.current.waves).toEqual([]);
  });

  it("fetches waves when org and repo are set, then clears loading", async () => {
    const { result } = renderHook(() => useWaveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchWaves).toHaveBeenCalledWith("epik-agent", "local");
    expect(result.current.waves).toEqual(sampleWaves);
    expect(result.current.loading).toBe(false);
  });

  it.each([
    { org: null, repo: "local", scopeLabel: null },
    { org: "epik-agent", repo: null, scopeLabel: null },
  ])("does not fetch when org=$org or repo=$repo is null", async ({ org, repo, scopeLabel }) => {
    mockUseProjectScope.mockReturnValue({
      org,
      repo,
      scopeLabel,
      setOrg: vi.fn(),
      setRepo: vi.fn(),
    });

    renderHook(() => useWaveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchWaves).not.toHaveBeenCalled();
  });

  it("auto-refreshes after the configured interval", async () => {
    renderHook(() => useWaveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchWaves).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });

    expect(mockFetchWaves).toHaveBeenCalledTimes(2);
  });

  it("sets loading to true while fetching", async () => {
    let resolvePromise!: (waves: Wave[]) => void;
    mockFetchWaves.mockReturnValueOnce(
      new Promise<Wave[]>((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useWaveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolvePromise(sampleWaves);
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
  });

  it("handles fetch errors gracefully", async () => {
    mockFetchWaves.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useWaveData());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.waves).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
