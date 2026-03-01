import { useState } from "react";
import type { McpToolCall } from "../lib/mcp";

export interface ToolCallDisplayProps {
  /** The MCP tool call to display. */
  toolCall: McpToolCall;
}

/**
 * Collapsible component that shows an MCP tool call: name, args, and result.
 *
 * The args section is collapsed by default.  Clicking the "Args" button toggles
 * it open/closed.  The result section is only rendered when a result is present.
 * A status indicator reflects the current lifecycle stage.
 */
export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps): React.ReactElement {
  const [argsOpen, setArgsOpen] = useState(false);

  const formattedArgs = JSON.stringify(toolCall.args, null, 2);

  return (
    <div
      className="rounded-lg border p-3 text-xs font-mono leading-relaxed"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-surface)" }}
      data-testid="tool-call-display"
    >
      {/* Header row: status + name */}
      <div className="flex items-center gap-2">
        <span
          data-testid="tool-call-status"
          data-status={toolCall.status}
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: statusColor(toolCall.status) }}
          aria-label={toolCall.status}
        />
        <span className="font-semibold" style={{ color: "var(--accent)" }}>
          {toolCall.name}
        </span>

        {/* Args toggle */}
        <button
          type="button"
          onClick={(): void => {
            setArgsOpen((prev) => !prev);
          }}
          className="ml-2 rounded px-2 py-1 text-xs"
          style={{ color: "var(--text-muted)", backgroundColor: "var(--bg)" }}
          aria-expanded={argsOpen}
          aria-controls="tool-call-args"
        >
          {argsOpen ? "▾ args" : "▸ args"}
        </button>
      </div>

      {/* Args section — hidden by default */}
      <pre
        id="tool-call-args"
        data-testid="tool-call-args"
        hidden={!argsOpen}
        className="mt-2 overflow-auto rounded p-2 text-xs"
        style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
      >
        {formattedArgs}
      </pre>

      {/* Result section — only rendered when a result is available */}
      {toolCall.result !== null && (
        <div
          data-testid="tool-call-result"
          className="mt-2 overflow-auto rounded p-2 text-xs leading-relaxed"
          style={{
            backgroundColor: "var(--bg)",
            color: toolCall.status === "error" ? "var(--color-error)" : "var(--text-muted)",
          }}
        >
          {toolCall.result}
        </div>
      )}
    </div>
  );
}

function statusColor(status: McpToolCall["status"]): string {
  switch (status) {
    case "pending":
      return "var(--text-muted)";
    case "running":
      return "var(--accent)";
    case "success":
      return "var(--color-success)";
    case "error":
      return "var(--color-error)";
  }
}
