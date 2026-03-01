import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useState } from "react";
import type { McpToolCall, ToolCallPayload, ToolResultPayload } from "../lib/mcp";

/**
 * Return type for the useMcpTools hook.
 */
export interface UseMcpToolsResult {
  /**
   * Map of tool call ID to ``McpToolCall`` for all tool calls seen in the
   * current session.  Updated in real time as events arrive.
   */
  toolCalls: Partial<Record<string, McpToolCall>>;
  /** Clear all tracked tool calls (e.g. when starting a new conversation). */
  clearToolCalls: () => void;
}

/**
 * Hook that tracks in-flight and completed MCP tool calls from sidecar events.
 *
 * Listens to the ``sidecar://tool_call`` and ``sidecar://tool_result`` Tauri
 * events and maintains a map of all tool calls keyed by their ``toolCallId``.
 * The map is updated in place as each call transitions through its lifecycle.
 *
 * Event listeners are registered on mount and cleaned up on unmount.
 */
export function useMcpTools(): UseMcpToolsResult {
  const [toolCalls, setToolCalls] = useState<Partial<Record<string, McpToolCall>>>({});

  useEffect(() => {
    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    const setupListeners = async (): Promise<void> => {
      const unlistenToolCall = await listen<ToolCallPayload>("sidecar://tool_call", (event) => {
        if (cancelled) return;
        const { requestId, toolCallId, name, args } = event.payload;
        const call: McpToolCall = {
          id: toolCallId,
          request_id: requestId,
          name,
          args,
          result: null,
          status: "running",
        };
        setToolCalls((prev) => ({ ...prev, [toolCallId]: call }));
      });

      const unlistenToolResult = await listen<ToolResultPayload>(
        "sidecar://tool_result",
        (event) => {
          if (cancelled) return;
          const { toolCallId, result, isError } = event.payload;
          setToolCalls((prev) => {
            const existing = prev[toolCallId];
            if (existing === undefined) return prev;
            return {
              ...prev,
              [toolCallId]: {
                ...existing,
                result,
                status: isError ? "error" : "success",
              },
            };
          });
        },
      );

      if (cancelled) {
        unlistenToolCall();
        unlistenToolResult();
      } else {
        unlisteners.push(unlistenToolCall, unlistenToolResult);
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

  const clearToolCalls = useCallback((): void => {
    setToolCalls({});
  }, []);

  return { toolCalls, clearToolCalls };
}
