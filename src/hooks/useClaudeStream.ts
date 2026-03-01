import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CancelPayload,
  CompletePayload,
  ErrorPayload,
  SendMessagePayload,
  TokenPayload,
} from "../lib/sidecar";

/**
 * Return type for the useClaudeStream hook.
 */
export interface UseClaudeStreamResult {
  /** Accumulated token chunks received so far for the current request. */
  tokens: string[];
  /** The complete response text once the stream finishes, or null while streaming. */
  response: string | null;
  /** Whether a streaming response is currently in flight. */
  streaming: boolean;
  /** Any error that occurred during the current request. */
  error: string | null;
  /** Send a message to Claude via the sidecar, optionally passing conversation history. */
  sendMessage: (message: string, history?: ConversationTurn[]) => Promise<void>;
  /** Cancel the currently in-flight streaming request. */
  cancel: () => Promise<void>;
}

/**
 * Generate a simple unique request identifier.
 */
function generateRequestId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook for streaming Claude responses through the Node.js sidecar.
 *
 * Subscribes to ``sidecar://token``, ``sidecar://complete``, and
 * ``sidecar://error`` Tauri events.  Token events whose ``requestId`` matches
 * the current in-flight request are accumulated in the ``tokens`` array.
 *
 * The event listeners are registered once on mount and cleaned up on unmount.
 */
export function useClaudeStream(): UseClaudeStreamResult {
  const [tokens, setTokens] = useState<string[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the current request ID via a ref so event callbacks always see
  // the latest value without needing it in the dependency array.
  const currentRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const setupListeners = async (): Promise<void> => {
      const unlistenToken = await listen<TokenPayload>("sidecar://token", (event) => {
        if (!cancelled && event.payload.requestId === currentRequestIdRef.current) {
          setTokens((prev) => [...prev, event.payload.token]);
        }
      });

      const unlistenComplete = await listen<CompletePayload>("sidecar://complete", (event) => {
        if (!cancelled && event.payload.requestId === currentRequestIdRef.current) {
          setResponse(event.payload.fullText);
          setStreaming(false);
          currentRequestIdRef.current = null;
        }
      });

      const unlistenError = await listen<ErrorPayload>("sidecar://error", (event) => {
        if (!cancelled && event.payload.requestId === currentRequestIdRef.current) {
          setError(event.payload.message);
          setStreaming(false);
          currentRequestIdRef.current = null;
        }
      });

      if (cancelled) {
        unlistenToken();
        unlistenComplete();
        unlistenError();
      } else {
        unlisteners.push(unlistenToken, unlistenComplete, unlistenError);
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

  const sendMessage = useCallback(
    async (message: string, history?: ConversationTurn[]): Promise<void> => {
      const requestId = generateRequestId();
      currentRequestIdRef.current = requestId;

      // Reset state for the new request
      setTokens([]);
      setResponse(null);
      setError(null);
      setStreaming(true);

      try {
        await invoke("sidecar_send_message", {
          requestId,
          message,
          history,
        } satisfies SendMessagePayload);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        setStreaming(false);
        currentRequestIdRef.current = null;
      }
    },
    [],
  );

  const cancel = useCallback(async (): Promise<void> => {
    const requestId = currentRequestIdRef.current;
    if (requestId === null) {
      return;
    }
    try {
      await invoke("sidecar_cancel", { requestId } satisfies CancelPayload);
      setStreaming(false);
      currentRequestIdRef.current = null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, []);

  return { tokens, response, streaming, error, sendMessage, cancel };
}
