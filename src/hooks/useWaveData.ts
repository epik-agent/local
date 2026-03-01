import { useCallback, useEffect, useState } from "react";
import type { Wave } from "../lib/build";
import { fetchWaves } from "../lib/waveApi";
import { useProjectScope } from "./useProjectScope";

/** Auto-refresh interval in milliseconds. */
const REFRESH_INTERVAL_MS = 30_000;

/**
 * Return type for the useWaveData hook.
 */
export interface UseWaveDataResult {
  /** Current list of waves with their issues. Empty while loading or when no project is set. */
  waves: Wave[];
  /** Whether a fetch is currently in flight. */
  loading: boolean;
}

/**
 * Hook that fetches the wave/issue plan for the currently selected project.
 *
 * Uses ``useProjectScope`` to get the current org/repo.  When both are set,
 * fetches wave data via ``fetchWaves`` and auto-refreshes every 30 seconds.
 * Returns an empty array when no project scope is selected or on fetch error.
 */
export function useWaveData(): UseWaveDataResult {
  const { org, repo } = useProjectScope();
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (org === null || repo === null) {
      return;
    }
    setLoading(true);
    try {
      const result = await fetchWaves(org, repo);
      setWaves(result);
    } catch {
      // Silently ignore fetch errors — keep last known data
    } finally {
      setLoading(false);
    }
  }, [org, repo]);

  useEffect(() => {
    void refresh();

    if (org === null || repo === null) return undefined;

    const intervalId = setInterval((): void => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return (): void => {
      clearInterval(intervalId);
    };
  }, [org, repo, refresh]);

  return { waves, loading };
}
