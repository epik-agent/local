/**
 * Newline-delimited JSON IPC protocol between the Rust backend and the
 * Node.js sidecar.
 *
 * Rust writes requests to the sidecar's stdin; the sidecar writes events to
 * its stdout.  All messages are separated by a single newline character.
 */

// ---------------------------------------------------------------------------
// Requests (stdin — Rust → Node.js)
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SendMessageRequest {
  type: "send_message";
  request_id: string;
  message: string;
  history?: ConversationTurn[];
}

export interface CancelRequest {
  type: "cancel";
  request_id: string;
}

export interface ShutdownRequest {
  type: "shutdown";
}

/**
 * Configuration for a single MCP server process.
 */
export interface McpServerConfig {
  /** Human-readable label for this MCP server. */
  name: string;
  /** Path to the MCP server executable or script. */
  command: string;
  /** Command-line arguments for the MCP server process. */
  args: string[];
  /** Optional environment variables to set for the MCP server process. */
  env?: Record<string, string>;
}

/**
 * Request to update the MCP server configuration and optional system prompt
 * used for all future Claude sessions.
 */
export interface SetMcpConfigRequest {
  type: "set_mcp_config";
  /** List of MCP servers to load as tool providers. */
  mcp_servers: McpServerConfig[];
  /**
   * Optional system prompt prepended to every Claude session.
   */
  system_prompt?: string;
}

export type SidecarRequest =
  | SendMessageRequest
  | CancelRequest
  | ShutdownRequest
  | SetMcpConfigRequest;

// ---------------------------------------------------------------------------
// Events (stdout — Node.js → Rust)
// ---------------------------------------------------------------------------

export interface ReadyEvent {
  type: "ready";
}

export interface TokenEvent {
  type: "token";
  request_id: string;
  token: string;
}

export interface CompleteEvent {
  type: "complete";
  request_id: string;
  full_text: string;
}

export interface ErrorEvent {
  type: "error";
  request_id: string;
  message: string;
}

/**
 * Emitted when Claude invokes an MCP tool during a streaming session.
 */
export interface ToolCallEvent {
  type: "tool_call";
  request_id: string;
  /** Unique identifier for this tool invocation. */
  tool_call_id: string;
  /** Name of the MCP tool being called. */
  name: string;
  /** Arguments passed to the tool. */
  args: Record<string, unknown>;
}

/**
 * Emitted when an MCP tool call completes (successfully or with an error).
 */
export interface ToolResultEvent {
  type: "tool_result";
  request_id: string;
  /** Matches the ``tool_call_id`` from the corresponding ``ToolCallEvent``. */
  tool_call_id: string;
  /** Serialised result from the tool. */
  result: string;
  /** Whether the tool call encountered an error. */
  is_error: boolean;
}

export type SidecarEvent =
  | ReadyEvent
  | TokenEvent
  | CompleteEvent
  | ErrorEvent
  | ToolCallEvent
  | ToolResultEvent;
