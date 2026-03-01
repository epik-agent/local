import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ToolCallDisplay } from "./ToolCallDisplay";
import type { McpToolCall } from "../lib/mcp";

function makeToolCall(overrides: Partial<McpToolCall> = {}): McpToolCall {
  return {
    id: "tc-1",
    request_id: "req-1",
    name: "get_feature",
    args: { featureId: "feat-1" },
    result: null,
    status: "running",
    ...overrides,
  };
}

describe("ToolCallDisplay", () => {
  it("renders the tool name", () => {
    render(<ToolCallDisplay toolCall={makeToolCall({ name: "plan_feature" })} />);
    expect(screen.getByText("plan_feature")).toBeInTheDocument();
  });

  it("renders a collapsed args section by default", () => {
    render(<ToolCallDisplay toolCall={makeToolCall()} />);
    const argsRegion = screen.queryByTestId("tool-call-args");
    expect(argsRegion).not.toBeVisible();
  });

  it("expands args section when the toggle is clicked", async () => {
    const user = userEvent.setup();
    render(<ToolCallDisplay toolCall={makeToolCall()} />);

    const toggle = screen.getByRole("button", { name: /args/i });
    await user.click(toggle);

    expect(screen.getByTestId("tool-call-args")).toBeVisible();
  });

  it("collapses args section when the toggle is clicked twice", async () => {
    const user = userEvent.setup();
    render(<ToolCallDisplay toolCall={makeToolCall()} />);

    const toggle = screen.getByRole("button", { name: /args/i });
    await user.click(toggle);
    await user.click(toggle);

    expect(screen.getByTestId("tool-call-args")).not.toBeVisible();
  });

  it("renders args as formatted JSON", async () => {
    const user = userEvent.setup();
    const args = { featureId: "feat-1", include: ["details"] };
    render(<ToolCallDisplay toolCall={makeToolCall({ args })} />);

    const toggle = screen.getByRole("button", { name: /args/i });
    await user.click(toggle);

    const argsEl = screen.getByTestId("tool-call-args");
    expect(argsEl.textContent).toContain('"featureId"');
    expect(argsEl.textContent).toContain('"feat-1"');
  });

  it("renders a running status indicator", () => {
    render(<ToolCallDisplay toolCall={makeToolCall({ status: "running" })} />);
    expect(screen.getByTestId("tool-call-status")).toHaveAttribute("data-status", "running");
  });

  it("renders a success status indicator when completed", () => {
    render(
      <ToolCallDisplay toolCall={makeToolCall({ status: "success", result: '{"ok": true}' })} />,
    );
    expect(screen.getByTestId("tool-call-status")).toHaveAttribute("data-status", "success");
  });

  it("renders an error status indicator on failure", () => {
    render(<ToolCallDisplay toolCall={makeToolCall({ status: "error", result: "Not found" })} />);
    expect(screen.getByTestId("tool-call-status")).toHaveAttribute("data-status", "error");
  });

  it("does not render a result section when result is null", () => {
    render(<ToolCallDisplay toolCall={makeToolCall({ result: null })} />);
    expect(screen.queryByTestId("tool-call-result")).not.toBeInTheDocument();
  });

  it("renders the result when available", () => {
    render(
      <ToolCallDisplay toolCall={makeToolCall({ status: "success", result: '{"issue": 7}' })} />,
    );
    expect(screen.getByTestId("tool-call-result")).toBeInTheDocument();
    expect(screen.getByTestId("tool-call-result").textContent).toContain('{"issue": 7}');
  });
});
