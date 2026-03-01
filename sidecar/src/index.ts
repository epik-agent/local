/**
 * Epik sidecar entry point.
 *
 * This process is spawned by the Tauri Rust backend and communicates over
 * stdin/stdout using a newline-delimited JSON protocol (see ``protocol.ts``).
 *
 * Lifecycle:
 *   1. Process starts and emits ``{"type":"ready"}`` on stdout.
 *   2. Rust writes ``send_message`` requests to stdin.
 *   3. Sidecar streams ``token`` events and a final ``complete`` event.
 *   4. Rust may send ``cancel`` to abort an in-flight request.
 *   5. Rust sends ``set_mcp_config`` to update MCP server list and system prompt.
 *   6. Rust sends ``shutdown`` (or closes stdin) to terminate cleanly.
 */

import { streamClaudeResponse } from "./claude-session.js";
import { listenStdin, writeEvent } from "./stdio-ipc.js";
import type { SidecarRequest, McpServerConfig } from "./protocol.js";

/** Map of in-flight request IDs to their AbortController. */
const inFlight = new Map<string, AbortController>();

/** Current MCP session configuration. */
let currentMcpServers: McpServerConfig[] = [];
let currentSystemPrompt: string | undefined;

function handleRequest(request: SidecarRequest): void {
  switch (request.type) {
    case "send_message": {
      const { request_id, message, history = [] } = request;
      const controller = new AbortController();
      inFlight.set(request_id, controller);

      void streamClaudeResponse(
        request_id,
        message,
        history,
        {
          onToken: (event) => writeEvent(event),
          onComplete: (event) => {
            inFlight.delete(request_id);
            writeEvent(event);
          },
          onError: (event) => {
            inFlight.delete(request_id);
            writeEvent(event);
          },
          onToolCall: (event) => writeEvent(event),
          onToolResult: (event) => writeEvent(event),
        },
        controller.signal,
        {
          mcpServers: currentMcpServers,
          systemPrompt: currentSystemPrompt,
        },
      );
      break;
    }

    case "cancel": {
      const { request_id } = request;
      const controller = inFlight.get(request_id);
      if (controller !== undefined) {
        controller.abort();
        inFlight.delete(request_id);
      }
      break;
    }

    case "set_mcp_config": {
      currentMcpServers = request.mcp_servers;
      currentSystemPrompt = request.system_prompt;
      break;
    }

    case "shutdown": {
      // Abort all in-flight requests then exit cleanly
      for (const controller of inFlight.values()) {
        controller.abort();
      }
      inFlight.clear();
      process.exit(0);
      break;
    }
  }
}

// Configure stdin for line-by-line reading
process.stdin.setEncoding("utf8");
process.stdin.resume();

// Exit when stdin closes (Rust process died or app closed)
process.stdin.on("end", () => {
  for (const controller of inFlight.values()) {
    controller.abort();
  }
  process.exit(0);
});

// Start listening for requests
listenStdin(handleRequest);

// Signal readiness to the Rust backend
writeEvent({ type: "ready" });
