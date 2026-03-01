import type {
  ConversationTurn,
  McpServerConfig,
  TokenEvent,
  CompleteEvent,
  ErrorEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "./protocol.js";

export type TokenCallback = (event: TokenEvent) => void;
export type CompleteCallback = (event: CompleteEvent) => void;
export type ErrorCallback = (event: ErrorEvent) => void;
export type ToolCallCallback = (event: ToolCallEvent) => void;
export type ToolResultCallback = (event: ToolResultEvent) => void;

export interface StreamCallbacks {
  onToken: TokenCallback;
  onComplete: CompleteCallback;
  onError: ErrorCallback;
  onToolCall?: ToolCallCallback;
  onToolResult?: ToolResultCallback;
}

/**
 * Runtime configuration for a Claude streaming session.
 */
export interface SessionConfig {
  /** MCP servers to load as tool providers for this session. */
  mcpServers: McpServerConfig[];
  /**
   * Optional system prompt prepended to the conversation.  Used to configure
   * Claude as an Epik planning assistant with project context.
   */
  systemPrompt?: string;
}

/**
 * Stream a Claude response for the given message using the Claude Code SDK.
 *
 * Emits token, complete, and error events through the provided callbacks.
 * If ``config.mcpServers`` is non-empty the SDK is configured to load those
 * servers as tool providers.  Tool call and result events are forwarded via
 * the optional ``onToolCall`` and ``onToolResult`` callbacks.
 *
 * The AbortSignal allows the caller to cancel the stream mid-flight.
 *
 * @param requestId  - Opaque identifier echoed in all emitted events.
 * @param message    - The user message to send to Claude.
 * @param history    - Prior conversation turns to include as context.
 * @param callbacks  - Callbacks for token, complete, error, and tool events.
 * @param signal     - AbortSignal to cancel the stream.
 * @param config     - Optional session configuration (MCP servers, system prompt).
 */
export async function streamClaudeResponse(
  requestId: string,
  message: string,
  history: ConversationTurn[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
  config?: SessionConfig,
): Promise<void> {
  // Lazily import the Claude Code SDK so the sidecar can start up quickly and
  // only load the SDK when the first message is sent.
  const { query } = await import("@anthropic-ai/claude-code");

  const prompt = buildPrompt(message, history, config?.systemPrompt);
  let fullText = "";

  // Build MCP server options if any servers are configured.
  const mcpServers = config?.mcpServers ?? [];
  const queryOptions: Parameters<typeof query>[0] = {
    prompt,
    abortController: signal !== undefined ? { signal } : undefined,
  };

  // Attach MCP servers if the SDK supports them.  The ``mcpServers`` option
  // accepts a list of server definitions; we only add it when there is at
  // least one server configured so we don't change SDK behaviour otherwise.
  if (mcpServers.length > 0) {
    // The Claude Code SDK accepts mcp_servers as a list of server configs.
    // We type-cast through unknown here because the SDK typings may not expose
    // this field yet; the runtime behaviour is what matters.
    (queryOptions as Record<string, unknown>)["mcp_servers"] = mcpServers.map((srv) => ({
      type: "stdio",
      name: srv.name,
      command: srv.command,
      args: srv.args,
      env: srv.env,
    }));
  }

  try {
    for await (const event of query(queryOptions)) {
      if (signal?.aborted === true) {
        break;
      }

      if (event.type === "assistant" && event.message.content) {
        for (const block of event.message.content) {
          if (block.type === "text" && block.text) {
            fullText += block.text;
            callbacks.onToken({
              type: "token",
              request_id: requestId,
              token: block.text,
            });
          }

          // Emit tool_call events when Claude invokes an MCP tool.
          if (block.type === "tool_use") {
            const toolCallId = block.id ?? `${requestId}-${String(Date.now())}`;
            callbacks.onToolCall?.({
              type: "tool_call",
              request_id: requestId,
              tool_call_id: toolCallId,
              name: block.name,
              args: (block.input as Record<string, unknown>) ?? {},
            });
          }
        }
      }

      // Emit tool_result events when a tool call returns.
      if (event.type === "tool") {
        const toolEvent = event as {
          tool_use_id?: string;
          content?: Array<{ type: string; text?: string }> | string;
          is_error?: boolean;
        };
        const toolCallId = toolEvent.tool_use_id ?? "";
        const resultText =
          typeof toolEvent.content === "string"
            ? toolEvent.content
            : (toolEvent.content
                ?.filter((c) => c.type === "text")
                .map((c) => c.text ?? "")
                .join("") ?? "");

        callbacks.onToolResult?.({
          type: "tool_result",
          request_id: requestId,
          tool_call_id: toolCallId,
          result: resultText,
          is_error: toolEvent.is_error === true,
        });
      }
    }

    if (signal?.aborted !== true) {
      callbacks.onComplete({
        type: "complete",
        request_id: requestId,
        full_text: fullText,
      });
    }
  } catch (err) {
    const message_text = err instanceof Error ? err.message : String(err);
    callbacks.onError({
      type: "error",
      request_id: requestId,
      message: message_text,
    });
  }
}

/**
 * Build a single prompt string from a message, optional conversation history,
 * and an optional system prompt.
 *
 * When a system prompt is provided it is prepended so Claude receives project
 * context before the conversation.  The Claude Code SDK's ``query`` function
 * accepts a single prompt string; history is included as a simple conversation
 * log so Claude has context from prior turns.
 */
function buildPrompt(message: string, history: ConversationTurn[], systemPrompt?: string): string {
  const lines: string[] = [];

  if (systemPrompt !== undefined && systemPrompt.length > 0) {
    lines.push(`System: ${systemPrompt}`);
    lines.push("");
  }

  for (const turn of history) {
    const role = turn.role === "user" ? "Human" : "Assistant";
    lines.push(`${role}: ${turn.content}`);
  }

  if (lines.length === 0) {
    return message;
  }

  lines.push(`Human: ${message}`);
  return lines.join("\n\n");
}
