import { invoke } from "@tauri-apps/api/core";
import { useCallback, useState } from "react";

/**
 * Return type for the useGreet hook.
 */
export interface UseGreetResult {
  /** The greeting message returned from the Rust backend, or null if not yet fetched. */
  message: string | null;
  /** Whether the IPC call is in flight. */
  loading: boolean;
  /** Any error that occurred during the IPC call. */
  error: string | null;
  /** Invoke the greet command with the given name. */
  greet: (name: string) => Promise<void>;
}

/**
 * Hook for calling the ``greet`` Tauri IPC command.
 *
 * Provides state for the greeting response, loading state, and error handling.
 * This hook demonstrates the Tauri IPC bridge between the frontend and the
 * Rust backend.
 */
export function useGreet(): UseGreetResult {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const greet = useCallback(async (name: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<string>("greet", { name });
      setMessage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  return { message, loading, error, greet };
}
