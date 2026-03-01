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
 * When ``sessionId`` is provided the hook listens to session-scoped event
 * channels (``sidecar://token/<sessionId>`` and
 * ``sidecar://complete/<sessionId>``) so each concurrent build session's output
 * is displayed independently.  When ``sessionId`` is omitted the hook falls
 * back to the global ``sidecar://token`` and ``sidecar://complete`` channels
 * used by the chat sidecar.
 *
 * Each token is appended as a new line.  When a new ``requestId`` is seen, the
 * accumulated lines are reset so only the current request's output is shown.
 *
 * Event listeners are registered on mount (or when ``sessionId`` changes) and
 * cleaned up on unmount.
 *
 * :param sessionId: Optional build session ID to scope event listening.
 */
export function useBuildStream(sessionId?: string): UseBuildStreamResult {
  const [lines, setLines] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(false);
  const currentRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const tokenChannel =
      sessionId !== undefined ? `sidecar://token/${sessionId}` : "sidecar://token";
    const completeChannel =
      sessionId !== undefined ? `sidecar://complete/${sessionId}` : "sidecar://complete";

    const setupListeners = async (): Promise<void> => {
      const unlistenToken = await listen<TokenPayload>(tokenChannel, (event) => {
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

      const unlistenComplete = await listen<CompletePayload>(completeChannel, (event) => {
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
  }, [sessionId]);

  return { lines, isActive };
}
