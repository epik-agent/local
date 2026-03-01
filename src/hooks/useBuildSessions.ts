import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BuildSession, BuildSessionStatus, BuildSessions } from "../lib/build";

/** Maximum number of concurrent build sessions. */
export const MAX_CONCURRENT_BUILDS = 3;

/**
 * Tauri event payload emitted on ``sidecar://build/status`` when a build
 * session's lifecycle state changes.
 */
interface BuildStatusPayload {
  sessionId: string;
  status: BuildSessionStatus;
}

/**
 * Return type for the ``useBuildSessions`` hook.
 */
export interface UseBuildSessionsResult {
  /** All tracked build sessions, keyed by session ID. */
  sessions: BuildSessions;
  /** The session ID that is currently selected for display, or ``null``. */
  activeSessionId: string | null;
  /**
   * Start a new concurrent build session for the given org/repo.
   *
   * Generates a UUID session ID, invokes ``sidecar_start_build`` on the Rust
   * backend, and adds the session to local state.  Rejects if the maximum
   * concurrent build limit has been reached.
   */
  startBuild: (org: string, repo: string) => Promise<string>;
  /**
   * Stop a running build session by ID.
   *
   * Invokes ``sidecar_stop_build`` on the Rust backend and marks the session
   * as cancelled.  Selects another active session if the stopped session was
   * the active one.
   */
  stopBuild: (sessionId: string) => Promise<void>;
  /**
   * Select a session to display in the build stream panel.
   *
   * The ``sessionId`` must be a key in ``sessions``.
   */
  selectSession: (sessionId: string) => void;
}

/**
 * Hook that manages multiple concurrent build sidecar sessions.
 *
 * Tracks a map of session ID → ``BuildSession`` and exposes operations to
 * start, stop, and select sessions.  Subscribes to ``sidecar://build/status``
 * Tauri events to update session status automatically when the Rust backend
 * signals a completion, failure, or cancellation.
 *
 * Resource limit: up to ``MAX_CONCURRENT_BUILDS`` (3) sessions may run
 * concurrently.
 */
export function useBuildSessions(): UseBuildSessionsResult {
  const [sessions, setSessions] = useState<BuildSessions>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  // Keep a ref to the current sessions map so callbacks can read it
  // synchronously without closing over stale state.
  const sessionsRef = useRef<BuildSessions>({});
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Subscribe to build status events from the Rust backend
  useEffect(() => {
    let cancelled = false;

    void listen<BuildStatusPayload>("sidecar://build/status", (event) => {
      if (cancelled) return;
      const { sessionId, status } = event.payload;

      setSessions((prev) => {
        if (!(sessionId in prev)) return prev;
        const session = prev[sessionId];

        const isTerminal = status === "completed" || status === "failed" || status === "cancelled";

        return {
          ...prev,
          [sessionId]: {
            ...session,
            status,
            completedAt: isTerminal ? new Date().toISOString() : session.completedAt,
          },
        };
      });
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

  const startBuild = useCallback(async (org: string, repo: string): Promise<string> => {
    // Read the current session map synchronously via the ref to check the
    // running count before committing any state update.
    const currentSessions = sessionsRef.current;
    const runningCount = Object.values(currentSessions).filter(
      (s) => s.status === "running",
    ).length;

    if (runningCount >= MAX_CONCURRENT_BUILDS) {
      throw new Error(
        `Maximum concurrent builds (${String(MAX_CONCURRENT_BUILDS)}) already reached`,
      );
    }

    // Use crypto.randomUUID() if available, otherwise generate a simple ID
    const sessionId: string =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session-${String(Date.now())}-${String(Math.random()).slice(2)}`;

    const newSession: BuildSession = {
      id: sessionId,
      org,
      repo,
      status: "running",
      startedAt: new Date().toISOString(),
    };

    setSessions((prev) => ({ ...prev, [sessionId]: newSession }));
    // Update the ref immediately so subsequent calls in the same tick see it
    sessionsRef.current = { ...currentSessions, [sessionId]: newSession };

    setActiveSessionId((prev) => prev ?? sessionId);

    try {
      await invoke("sidecar_start_build", { sessionId, repo });
    } catch (err) {
      // Roll back on Rust error
      setSessions((prev) => {
        const next = { ...prev };
        Reflect.deleteProperty(next, sessionId);
        return next;
      });
      Reflect.deleteProperty(sessionsRef.current, sessionId);
      throw err;
    }

    return sessionId;
  }, []);

  const stopBuild = useCallback(async (sessionId: string): Promise<void> => {
    await invoke("sidecar_stop_build", { sessionId });

    setSessions((prev) => {
      if (!(sessionId in prev)) return prev;
      const session = prev[sessionId];
      return {
        ...prev,
        [sessionId]: {
          ...session,
          status: "cancelled" as BuildSessionStatus,
          completedAt: new Date().toISOString(),
        },
      };
    });

    // If this was the active session, switch to another running one
    setActiveSessionId((prevActive) => {
      if (prevActive !== sessionId) return prevActive;

      const running = Object.values(sessionsRef.current).find(
        (s) => s.id !== sessionId && s.status === "running",
      );
      return running?.id ?? null;
    });
  }, []);

  const selectSession = useCallback((sessionId: string): void => {
    setActiveSessionId(sessionId);
  }, []);

  return { sessions, activeSessionId, startBuild, stopBuild, selectSession };
}
