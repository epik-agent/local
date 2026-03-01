/**
 * Types for MCP (Model Context Protocol) tool calls surfaced from the sidecar.
 */

/**
 * Status of an MCP tool call.
 */
export type McpToolStatus = "pending" | "running" | "success" | "error";

/**
 * A single MCP tool call record, tracking its lifecycle from invocation to result.
 */
export interface McpToolCall {
  /** Unique identifier for this tool call. */
  id: string;
  /** The request that triggered this tool call. */
  request_id: string;
  /** Name of the MCP tool that was called. */
  name: string;
  /** JSON-serialisable arguments passed to the tool. */
  args: Record<string, unknown>;
  /** The tool's result, populated when status is ``"success"`` or ``"error"``. */
  result: string | null;
  /** Current lifecycle status. */
  status: McpToolStatus;
}

/**
 * Tauri event payload emitted on ``sidecar://tool_call`` when a tool is invoked.
 */
export interface ToolCallPayload {
  /** Matches the ``requestId`` of the conversation turn. */
  requestId: string;
  /** Unique identifier for this tool invocation. */
  toolCallId: string;
  /** Name of the tool being called. */
  name: string;
  /** Serialised JSON arguments. */
  args: Record<string, unknown>;
}

/**
 * Tauri event payload emitted on ``sidecar://tool_result`` when a tool completes.
 */
export interface ToolResultPayload {
  /** Matches the ``requestId`` of the conversation turn. */
  requestId: string;
  /** Matches the ``toolCallId`` from the corresponding ``ToolCallPayload``. */
  toolCallId: string;
  /** Serialised result from the tool. */
  result: string;
  /** Whether the tool call encountered an error. */
  isError: boolean;
}

/**
 * Configuration for an MCP server to be loaded by the sidecar.
 */
export interface McpServerConfig {
  /** Human-readable name for this MCP server. */
  name: string;
  /** Path to the MCP server executable or script. */
  command: string;
  /** Arguments to pass to the MCP server process. */
  args: string[];
  /** Environment variables to set for the MCP server process. */
  env?: Record<string, string>;
}

/**
 * MCP configuration payload sent to the sidecar via ``sidecar_set_mcp_config``.
 */
export interface SidecarMcpConfig {
  /** List of MCP servers to load as tool providers. */
  mcpServers: McpServerConfig[];
  /** Optional system prompt to prepend to all Claude sessions. */
  systemPrompt?: string;
}
