import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SidecarStatus, StatusPayload } from "../lib/sidecar";

/**
 * Return type for the useSidecar hook.
 */
export interface UseSidecarResult {
  /** Current lifecycle status of the sidecar process. */
  status: SidecarStatus;
  /** Any error that occurred during sidecar lifecycle commands. */
  error: string | null;
  /** Spawn the sidecar process. */
  start: () => Promise<void>;
  /** Terminate the sidecar process. */
  stop: () => Promise<void>;
  /** Stop and restart the sidecar process. */
  restart: () => Promise<void>;
}

/**
 * Hook for managing the Node.js sidecar process lifecycle.
 *
 * Provides controls for starting, stopping, and restarting the sidecar, and
 * subscribes to ``sidecar://status`` Tauri events so the returned ``status``
 * always reflects the current process state.
 *
 * The status event listener is registered on mount and cleaned up on unmount.
 */
export function useSidecar(): UseSidecarResult {
  const [status, setStatus] = useState<SidecarStatus>("stopped");
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listen<StatusPayload>("sidecar://status", (event) => {
      if (!cancelled) {
        setStatus(event.payload.status);
      }
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenRef.current = unlisten;
      }
    });

    return (): void => {
      cancelled = true;
      if (unlistenRef.current !== null) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async (): Promise<void> => {
    setStatus("starting");
    setError(null);
    try {
      await invoke("sidecar_start");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    }
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await invoke("sidecar_stop");
      setStatus("stopped");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    }
  }, []);

  const restart = useCallback(async (): Promise<void> => {
    setStatus("starting");
    setError(null);
    try {
      await invoke("sidecar_restart");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("error");
    }
  }, []);

  return { status, error, start, stop, restart };
}
