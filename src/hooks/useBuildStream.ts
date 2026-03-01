import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { CompletePayload, TokenPayload } from "../lib/sidecar";

/**
 * Return type for the useBuildStream hook.
 */
export interface UseBuildStreamResult {
  /** Accumulated output lines from the active build sidecar. */
  lines: string[];
  /** Whether a build is currently streaming output. */
  isActive: boolean;
}

/**
 * Hook that subscribes to the sidecar token stream and accumulates output lines.
 *
 * Listens to ``sidecar://token`` and ``sidecar://complete`` Tauri events.
 * Each token is appended as a new line.  When a new ``requestId`` is seen, the
 * accumulated lines are reset so only the current build's output is shown.
 *
 * Event listeners are registered on mount and cleaned up on unmount.
 */
export function useBuildStream(): UseBuildStreamResult {
  const [lines, setLines] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const currentRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const setupListeners = async (): Promise<void> => {
      const unlistenToken = await listen<TokenPayload>("sidecar://token", (event) => {
        if (cancelled) return;
        const { requestId, token } = event.payload;

        if (requestId !== currentRequestIdRef.current) {
          // New build — reset accumulated lines
          currentRequestIdRef.current = requestId;
          setLines([token]);
        } else {
          setLines((prev) => [...prev, token]);
        }
        setIsActive(true);
      });

      const unlistenComplete = await listen<CompletePayload>("sidecar://complete", (event) => {
        if (cancelled) return;
        if (event.payload.requestId === currentRequestIdRef.current) {
          setIsActive(false);
        }
      });

      if (cancelled) {
        unlistenToken();
        unlistenComplete();
      } else {
        unlisteners.push(unlistenToken, unlistenComplete);
      }
    };

    void setupListeners();

    return (): void => {
      cancelled = true;
      for (const unlisten of unlisteners) {
        unlisten();
      }
    };
  }, []);

  return { lines, isActive };
}
